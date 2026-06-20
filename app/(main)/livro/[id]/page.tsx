import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda, formatarData } from '@/lib/utils'
import { corEstado, labelEstado } from '@/lib/preco/calcular'
import { cn } from '@/lib/utils'
import { Star, Calendar, User, ArrowLeftRight, ShoppingCart, BookOpen } from 'lucide-react'
import BotoesAcao from './BotoesAcao'
import type { Book } from '@/types/database.types'

interface PageProps {
  params: { id: string }
}

export default async function PaginaLivro({ params }: PageProps) {
  const supabase = createClient()

  const { data: livro } = await supabase
    .from('books')
    .select('*, vendedor:profiles(id, nome, rating, avatar_url)')
    .eq('id', params.id)
    .single()

  if (!livro) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isProprioLivro = user?.id === livro.vendedor_id

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Imagem */}
        <div className="relative aspect-[3/4] bg-areia-100 rounded-3xl overflow-hidden shadow-float">
          {livro.imagem_url ? (
            <Image
              src={livro.imagem_url}
              alt={livro.titulo}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen size={80} className="text-areia-400" />
            </div>
          )}

          {livro.vendido && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="bg-white text-gray-800 font-bold text-lg px-6 py-3 rounded-2xl">
                Vendido
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {/* Estado */}
          <span className={cn('badge-estado w-fit mb-3', corEstado(livro.estado))}>
            {labelEstado(livro.estado)}
            {livro.nota_estado != null && (
              <span className="ml-1 opacity-60">({livro.nota_estado}/10)</span>
            )}
          </span>

          <h1 className="font-display text-2xl md:text-3xl font-bold text-grafite leading-tight text-balance">
            {livro.titulo}
          </h1>
          <p className="text-gray-500 text-lg mt-1">{livro.autor}</p>

          {/* Preço */}
          <div className="mt-6">
            <p className="text-verde-600 font-bold text-3xl">{formatarMoeda(livro.preco)}</p>
            {livro.preco_sugerido && livro.preco !== livro.preco_sugerido && (
              <p className="text-xs text-gray-400 mt-0.5">
                Preço sugerido: {formatarMoeda(livro.preco_sugerido)}
              </p>
            )}
          </div>

          {/* Descrição */}
          {livro.descricao && (
            <p className="text-gray-600 text-sm leading-relaxed mt-4 p-4 bg-areia-50 rounded-xl border border-areia-200">
              {livro.descricao}
            </p>
          )}

          {/* Detalhes */}
          <div className="mt-4 space-y-2 text-sm text-gray-500">
            {livro.categoria && (
              <div className="flex items-center gap-2">
                <BookOpen size={14} />
                <span>{livro.categoria}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>Publicado em {formatarData(livro.created_at)}</span>
            </div>
          </div>

          {/* Vendedor */}
          <div className="mt-6 p-4 bg-areia-50 rounded-xl border border-areia-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-verde-100 rounded-full flex items-center justify-center">
              <User size={18} className="text-verde-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Vendedor</p>
              <p className="text-sm font-semibold text-gray-800">
                {(livro.vendedor as { nome: string })?.nome}
              </p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i}
                    size={10}
                    className={i <= Math.round((livro.vendedor as { rating: number })?.rating || 5)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-areia-300'
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="mt-6 space-y-3">
            {isProprioLivro ? (
              <div className="space-y-2">
                <Link href={`/painel/meus-livros`} className="btn-secondary w-full">
                  Gerenciar meus livros
                </Link>
              </div>
            ) : livro.vendido ? (
              <p className="text-center text-gray-400 text-sm py-4">Este livro não está mais disponível.</p>
            ) : (
              <BotoesAcao
                livroId={livro.id}
                aceitaTroca={livro.aceita_troca}
                userId={user?.id || null}
                vendedorId={livro.vendedor_id}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
