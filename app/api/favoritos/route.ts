import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/favoritos – Adiciona um livro aos favoritos
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { book_id } = await request.json()
    if (!book_id) return NextResponse.json({ error: 'book_id obrigatório' }, { status: 400 })

    const { data, error } = await supabase
      .from('favoritos')
      .insert({ usuario_id: user.id, book_id })
      .select()
      .single()

    if (error) {
      // Já favoritado (constraint UNIQUE) — não é erro real, apenas idempotente
      if (error.code === '23505') {
        return NextResponse.json({ ja_favoritado: true })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[API /favoritos POST]', error)
    return NextResponse.json({ error: 'Erro ao favoritar' }, { status: 500 })
  }
}

// DELETE /api/favoritos – Remove um livro dos favoritos
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { book_id } = await request.json()
    if (!book_id) return NextResponse.json({ error: 'book_id obrigatório' }, { status: 400 })

    await supabase
      .from('favoritos')
      .delete()
      .eq('usuario_id', user.id)
      .eq('book_id', book_id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /favoritos DELETE]', error)
    return NextResponse.json({ error: 'Erro ao desfavoritar' }, { status: 500 })
  }
}

// GET /api/favoritos – Lista os livros favoritados do usuário logado
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data } = await supabase
      .from('favoritos')
      .select('*, book:books(*, vendedor:profiles(id, nome), categoria:categorias(id, nome))')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[API /favoritos GET]', error)
    return NextResponse.json({ error: 'Erro ao listar favoritos' }, { status: 500 })
  }
}
