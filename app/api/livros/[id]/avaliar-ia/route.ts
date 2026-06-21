import { NextRequest, NextResponse } from 'next/server'
import { avaliarEstadoComIA, MAX_TENTATIVAS_AVALIACAO_IA } from '@/lib/ia/analisar-livro'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/livros/[id]/avaliar-ia
// Solicita avaliação de estado pela IA para um livro já publicado.
// Só o dono do livro pode chamar esta rota.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Busca o livro e confirma que pertence ao usuário logado
    const { data: livro } = await supabase
      .from('books')
      .select('id, vendedor_id, fotos, tentativas_avaliacao_ia, status_avaliacao_ia')
      .eq('id', params.id)
      .single()

    if (!livro) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 })
    }
    if (livro.vendedor_id !== user.id) {
      return NextResponse.json({ error: 'Apenas o vendedor pode solicitar avaliação' }, { status: 403 })
    }
    if (livro.status_avaliacao_ia === 'PROCESSANDO') {
      return NextResponse.json({ error: 'Avaliação já está em andamento' }, { status: 409 })
    }
    if (livro.tentativas_avaliacao_ia >= MAX_TENTATIVAS_AVALIACAO_IA) {
      return NextResponse.json(
        { error: `Limite de ${MAX_TENTATIVAS_AVALIACAO_IA} avaliações por livro atingido` },
        { status: 429 }
      )
    }
    if (!livro.fotos || livro.fotos.length < 3) {
      return NextResponse.json(
        { error: 'O livro precisa de pelo menos 3 fotos para ser avaliado' },
        { status: 400 }
      )
    }

    // Marca como processando (feedback visual imediato no front)
    const admin = createAdminClient()
    await admin
      .from('books')
      .update({
        status_avaliacao_ia: 'PROCESSANDO',
        avaliacao_ia_solicitada_em: new Date().toISOString(),
      })
      .eq('id', params.id)

    try {
      // Baixa as fotos e converte para base64 para enviar à IA
      const fotosBase64 = await Promise.all(
        livro.fotos.slice(0, 5).map(async (url: string) => {
          const res = await fetch(url)
          const buffer = await res.arrayBuffer()
          const mimeType = res.headers.get('content-type') || 'image/jpeg'
          return {
            base64: Buffer.from(buffer).toString('base64'),
            mimeType,
          }
        })
      )

      const avaliacao = await avaliarEstadoComIA(fotosBase64)

      await admin
        .from('books')
        .update({
          estado_ia: avaliacao.estado,
          nota_ia: avaliacao.nota,
          descricao_estado_ia: avaliacao.descricao,
          status_avaliacao_ia: 'CONCLUIDA',
          avaliacao_ia_concluida_em: new Date().toISOString(),
          tentativas_avaliacao_ia: livro.tentativas_avaliacao_ia + 1,
        })
        .eq('id', params.id)

      return NextResponse.json({ status: 'CONCLUIDA', ...avaliacao })
    } catch (erroAvaliacao) {
      // Se a avaliação falhar, reverte o status mas conta a tentativa
      // (evita loop infinito de retentar uma foto problemática)
      await admin
        .from('books')
        .update({
          status_avaliacao_ia: 'ERRO',
          tentativas_avaliacao_ia: livro.tentativas_avaliacao_ia + 1,
        })
        .eq('id', params.id)

      throw erroAvaliacao
    }
  } catch (error) {
    console.error('[API /livros/[id]/avaliar-ia]', error)
    return NextResponse.json({ error: 'Erro ao processar avaliação' }, { status: 500 })
  }
}
