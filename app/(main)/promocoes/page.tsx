import { createClient } from '@/lib/supabase/server'
import BookCard from '@/components/livros/BookCard'
import { Tag, BookOpen } from 'lucide-react'
import Link from 'next/link'
import type { Book } from '@/types/database.types'

export const metadata = {
  title: 'Promoções',
}

export default async function PromocoesPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('books')
    .select('*, vendedor:profiles(id, nome), categoria:categorias(id, nome)')
    .eq('vendido', false)
    .not('tipo_desconto', 'is', null)
    .order('created_at', { ascending: false })
    .limit(60)

  const livros = (data || []) as Book[]

  const { data: { user } } = await supabase.auth.getUser()
  let idsFavoritados = new Set<string>()
  if (user && livros.length) {
    const { data: favoritos } = await supabase
      .from('favoritos')
      .select('book_id')
      .eq('usuario_id', user.id)
      .in('book_id', livros.map(l => l.id))
    idsFavoritados = new Set((favoritos || []).map(f => f.book_id))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600
                         bg-orange-50 px-3 py-1 rounded-full mb-3">
          <Tag size={12} />
          Ofertas
        </span>
        <h1 className="font-display text-3xl font-bold text-grafite">Promoções</h1>
        <p className="text-gray-500 mt-2">Livros com desconto especial, direto dos vendedores.</p>
      </div>

      {!livros.length ? (
        <div className="text-center py-24">
          <BookOpen size={48} className="mx-auto text-areia-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Nenhuma promoção ativa agora</h3>
          <p className="text-gray-400 text-sm mt-1">Volte mais tarde para ver novas ofertas.</p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Ver todos os livros
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {livros.map(livro => (
            <BookCard
              key={livro.id}
              livro={livro}
              userId={user?.id || null}
              favoritado={idsFavoritados.has(livro.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
