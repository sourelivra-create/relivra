import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/doacoes/solicitar
// Usuário logado pede um livro de doação (destino='DOACAO') de graça.
// Só usuários cadastrados podem solicitar — igual vender/comprar/trocar.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { book_id, mensagem } = await request.json()
    if (!book_id) {
      return NextResponse.json({ error: 'Livro não informado' }, { status: 400 })
    }

    const { data: livro } = await supabase
      .from('books')
      .select('id, destino, vendedor_id, vendido')
      .eq('id', book_id)
      .single()

    if (!livro) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 })
    }
    if (livro.destino !== 'DOACAO') {
      return NextResponse.json({ error: 'Este livro não está disponível para doação' }, { status: 400 })
    }
    if (livro.vendido) {
      return NextResponse.json({ error: 'Este livro não está mais disponível' }, { status: 400 })
    }
    if (livro.vendedor_id === user.id) {
      return NextResponse.json({ error: 'Você não pode solicitar seu próprio livro' }, { status: 400 })
    }

    const { data: solicitacao, error } = await supabase
      .from('solicitacoes_doacao')
      .insert({
        book_id,
        solicitante_id: user.id,
        status: 'PENDENTE',
        mensagem: mensagem || null,
      })
      .select()
      .single()

    if (error) {
      // Índice único parcial (migration 010) barra segunda solicitação
      // ativa pro mesmo livro — código 23505 é violação de unicidade
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma solicitação ativa para este livro. Aguarde a resposta do doador ou tente outro livro.' },
          { status: 409 }
        )
      }
      console.error('[Solicitar doação]', error)
      return NextResponse.json({ error: 'Erro ao criar solicitação' }, { status: 500 })
    }

    return NextResponse.json(solicitacao)
  } catch (err) {
    console.error('[Solicitar doação]', err)
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 })
  }
}
