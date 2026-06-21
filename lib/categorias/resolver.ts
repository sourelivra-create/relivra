import { createAdminClient } from '@/lib/supabase/server'
import type { Categoria } from '@/types/database.types'

/**
 * Normaliza um texto para comparação: remove acentos, espaços extras,
 * deixa minúsculo. Usado para evitar categorias duplicadas como
 * "Ficção Científica" vs "ficção cientifica" vs "Ficcao Cientifica".
 */
function normalizarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Dado o nome de categoria sugerido pela IA (ex: "Ficção Científica"),
 * busca se já existe uma categoria equivalente no banco. Se existir,
 * retorna ela. Se não existir, cria uma nova categoria e a retorna.
 *
 * Isso é o que permite à IA categorizar livros dinamicamente, sem
 * cair sempre em "Outros" quando o livro não se encaixa nas categorias
 * pré-existentes.
 */
export async function resolverCategoria(nomeCategoria: string): Promise<Categoria> {
  const slug = normalizarSlug(nomeCategoria)
  const supabase = createAdminClient()

  // 1. Tenta achar uma categoria já existente com esse slug
  const { data: existente } = await supabase
    .from('categorias')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (existente) {
    return existente as Categoria
  }

  // 2. Não existe — cria uma nova categoria, marcada como criada pela IA
  const { data: nova, error } = await supabase
    .from('categorias')
    .insert({
      nome: nomeCategoria.trim(),
      slug,
      criada_por_ia: true,
    })
    .select()
    .single()

  if (error) {
    // Caso raro de corrida (duas requisições criando a mesma categoria
    // ao mesmo tempo) — tenta buscar de novo, já deve existir agora
    const { data: retry } = await supabase
      .from('categorias')
      .select('*')
      .eq('slug', slug)
      .single()

    if (retry) return retry as Categoria
    throw error
  }

  return nova as Categoria
}

/**
 * Lista todas as categorias existentes, para exibir como sugestão
 * no formulário de venda (autocomplete) ou nos filtros da home.
 */
export async function listarCategorias(): Promise<Categoria[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .order('nome', { ascending: true })

  return (data || []) as Categoria[]
}
