'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GaleriaFotosProps {
  fotos: string[]
  titulo: string
  vendido: boolean
}

export default function GaleriaFotos({ fotos, titulo, vendido }: GaleriaFotosProps) {
  const [fotoAtiva, setFotoAtiva] = useState(0)

  if (!fotos.length) {
    return (
      <div className="relative aspect-[3/4] bg-areia-100 rounded-3xl overflow-hidden shadow-float">
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen size={80} className="text-areia-400" />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Foto principal */}
      <div className="relative aspect-[3/4] bg-areia-100 rounded-3xl overflow-hidden shadow-float">
        <Image
          src={fotos[fotoAtiva]}
          alt={titulo}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {vendido && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-white text-gray-800 font-bold text-lg px-6 py-3 rounded-2xl">
              Vendido
            </span>
          </div>
        )}
      </div>

      {/* Miniaturas — só aparece se tiver mais de 1 foto */}
      {fotos.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {fotos.map((foto, i) => (
            <button
              key={i}
              onClick={() => setFotoAtiva(i)}
              className={cn(
                'relative w-16 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-colors',
                fotoAtiva === i ? 'border-verde-deep' : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              <Image src={foto} alt={`${titulo} - foto ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
