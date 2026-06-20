import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import BookCard, { BookCardSkeleton } from '@/components/livros/BookCard'
import FiltrosLivros from '@/components/livros/FiltrosLivros'
import type { Book, EstadoLivro, CategoriaLivro } from '@/types/database.types'
import { BookOpen, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface HomeProps {
  searchParams: {
    estado?: EstadoLivro
    categoria?: CategoriaLivro
    preco_min?: string
    preco_max?: string
    troca?: string
    busca?: string
  }
}

async function ListaLivros({ searchParams }: HomeProps) {
  const supabase = createClient()

  let query = supabase
    .from('books')
    .select('*, vendedor:profiles(id, nome)')
    .eq('vendido', false)
    .order('created_at', { ascending: false })
    .limit(60)

  if (searchParams.estado) {
    query = query.eq('estado', searchParams.estado)
  }
  if (searchParams.categoria) {
    query = query.eq('categoria', searchParams.categoria)
  }
  if (searchParams.preco_min) {
    query = query.gte('preco', Number(searchParams.preco_min))
  }
  if (searchParams.preco_max) {
    query = query.lte('preco', Number(searchParams.preco_max))
  }
  if (searchParams.troca === '1') {
    query = query.eq('aceita_troca', true)
  }
  if (searchParams.busca) {
    query = query.or(`titulo.ilike.%${searchParams.busca}%,autor.ilike.%${searchParams.busca}%`)
  }

  const { data } = await query
  const livros = (data || []) as Book[]

  if (!livros.length) {
    return (
      <div className="text-center py-24">
        <BookOpen size={48} className="mx-auto text-areia-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">Nenhum livro encontrado</h3>
        <p className="text-gray-400 text-sm mt-1">Tente outros filtros ou seja o primeiro a vender!</p>
        <Link href="/vender" className="btn-primary mt-6 inline-flex">
          Publicar livro
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
      {livros.map((livro) => (
        <BookCard key={livro.id} livro={livro} />
      ))}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function HomePage({ searchParams }: HomeProps) {
  const temFiltro = Object.values(searchParams).some(Boolean)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero — apenas sem filtro ativo */}
      {!temFiltro && (
        <div className="bg-relivra rounded-3xl p-6 md:p-10 mb-10 relative overflow-hidden">
          {/* Círculos decorativos sutis, como no brand kit */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute right-8 -bottom-20 w-44 h-44 rounded-full bg-white/[0.04]" />

          <div className="max-w-xl relative z-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-verde-pale 
                             bg-white/15 px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
              <TrendingUp size={12} />
              Economia circular de livros
            </span>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white leading-tight text-balance tracking-tight">
              Dê uma nova vida<br />aos seus livros
            </h1>
            <p className="text-white/75 mt-3 text-sm md:text-base leading-relaxed">
              Compre, venda e <em className="text-verde-pale not-italic font-semibold">troque</em> livros usados.
              IA avalia e precifica automaticamente.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/vender" className="bg-white text-verde-deep font-display font-bold text-sm 
                                               px-5 py-2.5 rounded-xl hover:bg-verde-pale transition-colors">
                Vender um livro
              </Link>
              <a href="#livros" className="text-white/90 font-medium text-sm px-5 py-2.5 rounded-xl
                                           border border-white/25 hover:bg-white/10 transition-colors">
                Ver livros disponíveis
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Suspense>
        <FiltrosLivros />
      </Suspense>

      {/* Lista */}
      <div id="livros" className="mt-6">
        <Suspense fallback={<SkeletonGrid />}>
          <ListaLivros searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}
