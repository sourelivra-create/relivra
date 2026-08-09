import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/livros/confirmar-disponibilidade
// acao = 'DISPONIVEL' -> reseta o relógio de 30 dias
// acao = 'INDISPONIVEL' -> tira o livro da loja (mesmo padrão de
// reservar_livros: mexe em quantidade_disponivel, o trigger do
// banco calcula "vendido" sozinho, sem os dois campos divergirem)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { book_id, acao } = await request.json()
    if (!book_id || !['DISPONIVEL', 'INDISPONIVEL'].includes(acao)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { data: livro } = await supabase
      .from('books')
      .select('id, vendedor_id')
      .eq('id', book_id)
      .single()

    if (!livro || livro.vendedor_id !== user.id) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 })
    }

    if (acao === 'DISPONIVEL') {
      await supabase
        .from('books')
        .update({ lembrete_disponibilidade_em: new Date().toISOString() })
        .eq('id', book_id)
    } else {
      await supabase
        .from('books')
        .update({
          quantidade_disponivel: 0,
          lembrete_disponibilidade_em: new Date().toISOString(),
        })
        .eq('id', book_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Confirmar disponibilidade]', err)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
