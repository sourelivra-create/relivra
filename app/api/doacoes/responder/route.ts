import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/doacoes/responder
// acao = 'ACEITAR' | 'RECUSAR' -> só o DONO do livro pode
// acao = 'CANCELAR' -> só o SOLICITANTE pode (desiste do próprio pedido)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { solicitacao_id, acao } = await request.json()
    if (!solicitacao_id || !['ACEITAR', 'RECUSAR', 'CANCELAR'].includes(acao)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { data: solicitacao } = await supabase
      .from('solicitacoes_doacao')
      .select('id, book_id, solicitante_id, status, book:books(id, vendedor_id, vendido)')
      .eq('id', solicitacao_id)
      .single()

    if (!solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }
    if (solicitacao.status !== 'PENDENTE') {
      return NextResponse.json({ error: 'Esta solicitação já foi respondida' }, { status: 400 })
    }

    const livro = solicitacao.book as unknown as { id: string; vendedor_id: string; vendido: boolean }

    if (acao === 'CANCELAR') {
      if (solicitacao.solicitante_id !== user.id) {
        return NextResponse.json({ error: 'Só quem solicitou pode cancelar' }, { status: 403 })
      }
      const { error } = await supabase
        .from('solicitacoes_doacao')
        .update({ status: 'CANCELADA' })
        .eq('id', solicitacao_id)
      if (error) return NextResponse.json({ error: 'Erro ao cancelar' }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // ACEITAR ou RECUSAR — só o dono do livro
    if (livro.vendedor_id !== user.id) {
      return NextResponse.json({ error: 'Só o dono do livro pode responder' }, { status: 403 })
    }

    if (acao === 'RECUSAR') {
      const { error } = await supabase
        .from('solicitacoes_doacao')
        .update({ status: 'RECUSADA' })
        .eq('id', solicitacao_id)
      if (error) return NextResponse.json({ error: 'Erro ao recusar' }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // ACEITAR — reserva atômica antes de confirmar. O livro pode já
    // ter sido reservado nesse meio tempo por uma troca aceita (o
    // outro caminho que compete pelo mesmo livro, ver migration 011).
    const { error: reservaError } = await supabase.rpc('reservar_livros', {
      p_book_ids: [livro.id],
    })

    if (reservaError) {
      // Livro já foi levado por outra negociação — esta solicitação
      // não pode mais ser aceita. Marcamos como CANCELADA (não é uma
      // recusa deliberada do dono, é indisponibilidade).
      await supabase
        .from('solicitacoes_doacao')
        .update({ status: 'CANCELADA' })
        .eq('id', solicitacao_id)
      return NextResponse.json(
        { error: 'Este livro já foi reservado por outra negociação (provavelmente uma troca aceita antes). A solicitação foi cancelada.' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('solicitacoes_doacao')
      .update({ status: 'ACEITA' })
      .eq('id', solicitacao_id)

    if (error) return NextResponse.json({ error: 'Erro ao aceitar' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Responder doação]', err)
    return NextResponse.json({ error: 'Erro ao processar resposta' }, { status: 500 })
  }
}
