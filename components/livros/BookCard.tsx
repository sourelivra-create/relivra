import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeftRight, BookOpen } from 'lucide-react'
import { cn, formatarMoeda } from '@/lib/utils'
import { corEstado, labelEstado } from '@/lib/preco/calcular'
import type { Book } from '@/types/database.types'

interface BookCardProps {
  livro: Book
  className?: string
}

export default function BookCard({ livro, className }: BookCardProps) {
  return (
    <Link href={`/livro/${livro.id}`} className={cn('card group block', className)}>
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

        {/* Badge de troca */}
        {livro.aceita_troca && (
          <div className="absolute top-2 right-2 bg-verde-500 text-white 
                          text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
            <ArrowLeftRight size={10} />
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
      <div className="p-3.5">
        {/* Estado */}
        <span className={cn('badge-estado mb-2', corEstado(livro.estado))}>
          {labelEstado(livro.estado)}
        </span>

        {/* Título e autor */}
        <h3 className="font-semibold text-sm text-grafite line-clamp-2 leading-tight">
          {livro.titulo}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{livro.autor}</p>

        {/* Preço */}
        <p className="text-verde-600 font-bold text-base mt-2">
          {formatarMoeda(livro.preco)}
        </p>
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
