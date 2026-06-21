import { NextRequest, NextResponse } from 'next/server'
import { analisarLivroComIA } from '@/lib/ia/analisar-livro'
import { calcularPrecoSugerido } from '@/lib/preco/calcular'
import { resolverCategoria, listarCategorias } from '@/lib/categorias/resolver'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const imagem = formData.get('imagem') as File | null

    if (!imagem) {
      return NextResponse.json({ error: 'Imagem obrigatória' }, { status: 400 })
    }

    // Validar tipo e tamanho
    const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!TIPOS_ACEITOS.includes(imagem.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use JPG, PNG ou WebP.' }, { status: 400 })
    }
    if (imagem.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem muito grande. Máximo 5MB.' }, { status: 400 })
    }

    // Converter para base64
    const buffer = await imagem.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Busca categorias existentes para a IA priorizar reaproveitá-las
    const categoriasExistentes = await listarCategorias()
    const nomesCategorias = categoriasExistentes.map(c => c.nome)

    // Análise com IA (já recebendo a sugestão de categoria)
    const analise = await analisarLivroComIA(base64, imagem.type, nomesCategorias)

    // Resolve a categoria: reaproveita uma existente ou cria uma nova
    const categoria = await resolverCategoria(analise.categoria_sugerida)

    // Calcular preço sugerido
    const { preco_sugerido, preco_mercado, fonte } = await calcularPrecoSugerido(
      analise.titulo,
      analise.autor,
      analise.estado
    )

    return NextResponse.json({
      ...analise,
      categoria_id: categoria.id,
      categoria_nome: categoria.nome,
      categoria_nova: categoria.criada_por_ia,
      preco_sugerido,
      preco_mercado,
      fonte_preco: fonte,
    })
  } catch (error) {
    console.error('[API /ia/analisar]', error)
    return NextResponse.json(
      { error: 'Erro interno ao analisar o livro.' },
      { status: 500 }
    )
  }
}
