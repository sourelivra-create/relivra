'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface BotaoFavoritoProps {
  bookId: string
  favoritadoInicial: boolean
  userId: string | null
  className?: string
}

export default function BotaoFavorito({ bookId, favoritadoInicial, userId, className }: BotaoFavoritoProps) {
  const router = useRouter()
  const [favoritado, setFavoritado] = useState(favoritadoInicial)
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      router.push(`/login?redirect=/livro/${bookId}`)
      return
    }

    if (loading) return
    setLoading(true)

    // Atualização otimista — muda visualmente antes da resposta do servidor,
    // para o clique parecer instantâneo
    const novoEstado = !favoritado
    setFavoritado(novoEstado)

    try {
      await fetch('/api/favoritos', {
        method: novoEstado ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId }),
      })
    } catch {
      // Se falhar, desfaz a atualização otimista
      setFavoritado(!novoEstado)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-label={favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all duration-150',
        'hover:scale-110 active:scale-95',
        className
      )}
    >
      <Heart
        size={20}
        className={cn(
          'transition-colors',
          favoritado ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'
        )}
      />
    </button>
  )
}
