import { NextRequest, NextResponse } from 'next/server'
import { resolverCategoria } from '@/lib/categorias/resolver'
import { createClient } from '@/lib/supabase/server'

// POST /api/categorias – Resolve (busca ou cria) uma categoria pelo nome.
// Usado quando o usuário digita uma categoria manualmente no formulário
// de venda, sem ter passado pela análise de IA.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { nome } = await request.json()
    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 })
    }

    const categoria = await resolverCategoria(nome.trim())

    return NextResponse.json(categoria)
  } catch (error) {
    console.error('[API /categorias POST]', error)
    return NextResponse.json({ error: 'Erro ao resolver categoria' }, { status: 500 })
  }
}

// GET /api/categorias – Lista todas as categorias existentes
export async function GET() {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .order('nome', { ascending: true })

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[API /categorias GET]', error)
    return NextResponse.json({ error: 'Erro ao listar categorias' }, { status: 500 })
  }
}
