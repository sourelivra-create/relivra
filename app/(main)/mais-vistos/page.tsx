import { createClient } from '@/lib/supabase/server'
import BookCard from '@/components/livros/BookCard'
import { TrendingUp, BookOpen } from 'lucide-react'
import Link from 'next/link'
import type { Book } from '@/types/database.types'

export const metadata = {
  title: 'Mais vistos',
}

export default async function MaisVistosPage() {
  const supabase = createClient()

  // Nota: ainda não temos rastreamento de visualizações por livro.
  // Por ora, "mais vistos" mostra os livros mais recentes disponíveis
  // como uma curadoria de destaque. Quando tivermos uma coluna de
  // contagem de views (ou integração com analytics), trocar a
  // ordenação abaixo por ela.
  const { data } = await supabase
    .from('books')
    .select('*, vendedor:profiles(id, nome), categoria:categorias(id, nome)')
    .eq('vendido', false)
    .order('created_at', { ascending: false })
    .limit(24)

  const livros = (data || []) as Book[]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-verde-deep
                         bg-verde-50 px-3 py-1 rounded-full mb-3">
          <TrendingUp size={12} />
          Destaques
        </span>
        <h1 className="font-display text-3xl font-bold text-grafite">Mais vistos</h1>
        <p className="text-gray-500 mt-2">Os livros que estão chamando mais atenção por aqui.</p>
      </div>

      {!livros.length ? (
        <div className="text-center py-24">
          <BookOpen size={48} className="mx-auto text-areia-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Nenhum livro publicado ainda</h3>
          <Link href="/vender" className="btn-primary mt-6 inline-flex">
            Publicar livro
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {livros.map(livro => (
            <BookCard key={livro.id} livro={livro} />
          ))}
        </div>
      )}
    </div>
  )
}
