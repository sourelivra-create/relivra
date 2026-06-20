import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Plus, Eye, Trash2 } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import { corEstado, labelEstado } from '@/lib/preco/calcular'
import { cn } from '@/lib/utils'
import DeleteBook from './DeleteBook'

export default async function MeusLivrosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: livros } = await supabase
    .from('books')
    .select('*')
    .eq('vendedor_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl">Meus livros</h2>
        <Link href="/vender" className="btn-primary gap-1.5">
          <Plus size={16} />
          Publicar
        </Link>
      </div>

      {!livros?.length ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 text-areia-300" />
          <p className="font-medium">Você ainda não publicou nenhum livro</p>
          <Link href="/vender" className="btn-primary mt-4 inline-flex">
            Publicar meu primeiro livro
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {livros.map(livro => (
            <div
              key={livro.id}
              className={cn(
                'card flex items-center gap-4 p-4',
                livro.vendido && 'opacity-60'
              )}
            >
              {/* Imagem */}
              <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-areia-100">
                {livro.imagem_url ? (
                  <Image src={livro.imagem_url} alt={livro.titulo} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen size={16} className="text-areia-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-grafite truncate">{livro.titulo}</p>
                <p className="text-xs text-gray-500">{livro.autor}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('badge-estado text-xs', corEstado(livro.estado))}>
                    {labelEstado(livro.estado)}
                  </span>
                  {livro.vendido && (
                    <span className="text-xs text-gray-400 font-medium">Vendido</span>
                  )}
                  {livro.aceita_troca && !livro.vendido && (
                    <span className="text-xs text-verde-600 font-medium">↔ Troca</span>
                  )}
                </div>
              </div>

              {/* Preço */}
              <p className="text-verde-600 font-bold text-sm shrink-0">
                {formatarMoeda(livro.preco)}
              </p>

              {/* Ações */}
              <div className="flex items-center gap-1 shrink-0">
                <Link href={`/livro/${livro.id}`} className="btn-ghost p-2">
                  <Eye size={16} />
                </Link>
                {!livro.vendido && <DeleteBook bookId={livro.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
