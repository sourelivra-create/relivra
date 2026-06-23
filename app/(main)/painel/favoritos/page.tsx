import { createClient } from '@/lib/supabase/server'
import BookCard from '@/components/livros/BookCard'
import { Heart, BookOpen } from 'lucide-react'
import Link from 'next/link'
import type { Book } from '@/types/database.types'

export default async function FavoritosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Busca os favoritos do usuário (sem join, evita ambiguidade de FK)
  const { data: favoritos, error: erroFavoritos } = await supabase
    .from('favoritos')
    .select('book_id, created_at')
    .eq('usuario_id', user!.id)
    .order('created_at', { ascending: false })

  const bookIds = (favoritos || []).map(f => f.book_id)

  // Busca os livros separadamente, preservando a ordem de favoritado
  let livros: Book[] = []
  if (bookIds.length) {
    const { data } = await supabase
      .from('books')
      .select('*, vendedor:profiles(id, nome), categoria:categorias(id, nome)')
      .in('id', bookIds)

    const livrosPorId = new Map((data || []).map(l => [l.id, l]))
    livros = bookIds.map(id => livrosPorId.get(id)).filter(Boolean) as Book[]
  }

  return (
    <div>
      <h2 className="font-display font-bold text-xl mb-4">Favoritos</h2>

      {erroFavoritos && (
        <p className="text-sm text-red-500 mb-4">
          Erro ao carregar favoritos: {erroFavoritos.message}
        </p>
      )}

      {!livros.length ? (
        <div className="text-center py-20 text-gray-400">
          <Heart size={48} className="mx-auto mb-3 text-areia-300" />
          <p className="font-medium">Você ainda não favoritou nenhum livro</p>
          <p className="text-sm mt-1">
            Clica no coração ❤️ de um livro para guardá-lo aqui
          </p>
          <Link href="/" className="btn-primary mt-4 inline-flex">
            Explorar livros
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {livros.map(livro => (
            <BookCard
              key={livro.id}
              livro={livro}
              userId={user?.id || null}
              favoritado={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
