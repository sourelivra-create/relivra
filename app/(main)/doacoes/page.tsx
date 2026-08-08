import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { Gift, BookOpen, ArrowLeftRight } from 'lucide-react'
import { corEstado, labelEstado } from '@/lib/preco/calcular'
import { cn } from '@/lib/utils'
import type { Book } from '@/types/database.types'
import SolicitarBotao from './SolicitarBotao'

export const metadata = {
  title: 'Doações',
}

export default async function DoacoesPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('books')
    .select('*, vendedor:profiles(id, nome)')
    .eq('destino', 'DOACAO')
    .eq('vendido', false)
    .order('created_at', { ascending: false })
    .limit(60)

  const livros = (data || []) as Book[]

  const { data: { user } } = await supabase.auth.getUser()

  // Só dá pra saber quais SUAS PRÓPRIAS solicitações estão ativas —
  // RLS não deixa um usuário ver solicitação de livro alheio, então
  // não mostramos "quantos já pediram", só "você já pediu este"
  let meusBookIdsSolicitados = new Set<string>()
  if (user && livros.length) {
    const { data: minhasSolicitacoes } = await supabase
      .from('solicitacoes_doacao')
      .select('book_id')
      .eq('solicitante_id', user.id)
      .in('status', ['PENDENTE', 'ACEITA'])
      .in('book_id', livros.map(l => l.id))

    meusBookIdsSolicitados = new Set((minhasSolicitacoes || []).map(s => s.book_id))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-verde-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Gift size={26} className="text-verde-600" />
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-grafite">Doações</h1>
        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
          Livros que não valem mais a pena vender, mas ainda merecem um novo leitor.
          Peça de graça, ou ofereça um dos seus livros em troca.
        </p>
      </div>

      {livros.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <BookOpen size={48} className="mx-auto text-areia-400 mb-4" />
          Nenhum livro de doação disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {livros.map(livro => (
            <div key={livro.id} className="card group relative flex flex-col">
              <Link href={`/livro/${livro.id}`} className="block">
                <div className="relative aspect-[3/4] bg-areia-100 overflow-hidden rounded-t-2xl">
                  {livro.imagem_url ? (
                    <Image
                      src={livro.imagem_url}
                      alt={livro.titulo}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen size={48} className="text-areia-400" />
                    </div>
                  )}

                  <div className="absolute top-2 left-2 bg-verde-500 text-white text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                    <Gift size={10} />
                    Doação
                  </div>

                  {livro.aceita_troca && (
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-grafite text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                      <ArrowLeftRight size={10} />
                      Aceita troca
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <span className={cn('badge-estado w-fit mb-1.5', corEstado(livro.estado))}>
                    {labelEstado(livro.estado)}
                  </span>
                  <p className="font-semibold text-sm text-gray-800 truncate">{livro.titulo}</p>
                  <p className="text-xs text-gray-500 truncate">{livro.autor}</p>
                </div>
              </Link>

              <div className="px-3 pb-3 mt-auto">
                <SolicitarBotao
                  bookId={livro.id}
                  userId={user?.id || null}
                  isProprioLivro={user?.id === livro.vendedor_id}
                  jaSolicitado={meusBookIdsSolicitados.has(livro.id)}
                  aceitaTroca={livro.aceita_troca}
                  vendedorId={livro.vendedor_id}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
