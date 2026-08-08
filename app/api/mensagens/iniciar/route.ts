import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/mensagens/iniciar
// Abre (ou reabre, se já existir) uma conversa sobre um livro.
// vendedor_id é sempre derivado do livro no SERVIDOR — nunca aceito
// do corpo da requisição, pra ninguém conseguir criar uma conversa
// fingindo que um livro é de outra pessoa.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { book_id } = await request.json()
    if (!book_id) {
      return NextResponse.json({ error: 'Livro não informado' }, { status: 400 })
    }

    const { data: livro } = await supabase
      .from('books')
      .select('id, vendedor_id')
      .eq('id', book_id)
      .single()

    if (!livro) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 })
    }
    if (livro.vendedor_id === user.id) {
      return NextResponse.json({ error: 'Você não pode conversar consigo mesmo' }, { status: 400 })
    }

    // Já existe conversa desse comprador sobre esse livro?
    const { data: existente } = await supabase
      .from('conversas')
      .select('id')
      .eq('book_id', book_id)
      .eq('comprador_id', user.id)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ id: existente.id })
    }

    const { data: nova, error } = await supabase
      .from('conversas')
      .insert({
        book_id,
        comprador_id: user.id,
        vendedor_id: livro.vendedor_id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Iniciar conversa]', error)
      return NextResponse.json({ error: 'Erro ao iniciar conversa' }, { status: 500 })
    }

    return NextResponse.json({ id: nova.id })
  } catch (err) {
    console.error('[Iniciar conversa]', err)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
