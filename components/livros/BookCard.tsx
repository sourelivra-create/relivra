import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeftRight, BookOpen, Tag, Gift } from 'lucide-react'
import { cn, formatarMoeda } from '@/lib/utils'
import { corEstado, labelEstado } from '@/lib/preco/calcular'
import BotaoFavorito from './BotaoFavorito'
import type { Book } from '@/types/database.types'

interface BookCardProps {
  livro: Book
  userId?: string | null
  favoritado?: boolean
  className?: string
}

export default function BookCard({ livro, userId = null, favoritado = false, className }: BookCardProps) {
  const temDesconto = livro.tipo_desconto && livro.valor_desconto && livro.preco_final < livro.preco

  return (
    <Link href={`/livro/${livro.id}`} className={cn('card group block relative', className)}>
      {/* Imagem */}
      <div className="relative aspect-[3/4] bg-areia-100 overflow-hidden">
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

        {/* Botão de favorito */}
        <BotaoFavorito
          bookId={livro.id}
          favoritadoInicial={favoritado}
          userId={userId}
          className="absolute top-1.5 left-1.5 w-7 h-7 bg-white/90 backdrop-blur-sm shadow-sm"
        />

        {/* Badge de doação — livro de doação nunca tem desconto
            (preco=0), então ocupa o mesmo canto que o badge de
            desconto ocuparia, sem conflito */}
        {livro.destino === 'DOACAO' && (
          <div className="absolute top-1.5 right-1.5 bg-verde-500 text-white
                          text-[10px] font-semibold px-1.5 py-1 rounded-md flex items-center gap-1">
            <Gift size={9} />
            Doação
          </div>
        )}

        {/* Badge de desconto */}
        {temDesconto && (
          <div className="absolute top-2 right-2 bg-red-500 text-white
                          text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
            <Tag size={10} />
            {livro.tipo_desconto === 'PERCENTUAL' ? `-${livro.valor_desconto}%` : 'Desconto'}
          </div>
        )}

        {/* Badge de troca — desce se já tiver badge de desconto ou de doação */}
        {livro.aceita_troca && (
          <div className={cn(
            'absolute right-1.5 bg-verde-500 text-white text-[10px] font-semibold px-1.5 py-1 rounded-md flex items-center gap-1',
            (temDesconto || livro.destino === 'DOACAO') ? 'top-8' : 'top-1.5'
          )}>
            <ArrowLeftRight size={9} />
            Troca
          </div>
        )}

        {/* Badge vendido */}
        {livro.vendido && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-700 font-semibold text-sm px-3 py-1.5 rounded-lg">
              Vendido
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        {/* Estado */}
        <span className={cn('badge-estado mb-1.5 text-[10px]', corEstado(livro.estado))}>
          {labelEstado(livro.estado)}
        </span>

        {/* Título e autor */}
        <h3 className="font-semibold text-xs text-grafite line-clamp-2 leading-tight">
          {livro.titulo}
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{livro.autor}</p>

        {/* Preço — ou badge de doação, se o livro virou doação depois
            de favoritado (nota editada pelo vendedor pra baixo) */}
        {livro.destino === 'DOACAO' ? (
          <p className="text-verde-600 font-bold text-xs mt-1.5">Doação — sem custo</p>
        ) : temDesconto ? (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <p className="text-gray-400 text-[10px] line-through">{formatarMoeda(livro.preco)}</p>
            <p className="text-verde-600 font-bold text-sm">{formatarMoeda(livro.preco_final)}</p>
          </div>
        ) : (
          <p className="text-verde-600 font-bold text-sm mt-1.5">
            {formatarMoeda(livro.preco)}
          </p>
        )}
      </div>
    </Link>
  )
}

// Skeleton do card para loading
export function BookCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[3/4] skeleton" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 skeleton w-16 rounded-full" />
        <div className="h-4 skeleton w-full" />
        <div className="h-3 skeleton w-24" />
        <div className="h-5 skeleton w-20" />
      </div>
    </div>
  )
}
