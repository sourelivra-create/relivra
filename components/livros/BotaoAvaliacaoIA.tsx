'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import type { StatusAvaliacaoIA } from '@/types/database.types'

interface BotaoAvaliacaoIAProps {
  livroId: string
  statusAtual: StatusAvaliacaoIA
  tentativasRestantes: number
}

export default function BotaoAvaliacaoIA({
  livroId,
  statusAtual,
  tentativasRestantes,
}: BotaoAvaliacaoIAProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSolicitar = async () => {
    setLoading(true)
    setErro('')

    try {
      const res = await fetch(`/api/livros/${livroId}/avaliar-ia`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || 'Erro ao solicitar avaliação')
        setLoading(false)
        return
      }

      router.refresh()
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (statusAtual === 'PROCESSANDO') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-areia-50 rounded-xl p-3 border border-areia-200">
        <Loader2 size={14} className="animate-spin" />
        Aguardando avaliação da IA...
      </div>
    )
  }

  if (tentativasRestantes <= 0) {
    return (
      <p className="text-xs text-gray-400 text-center">
        Limite de avaliações da IA atingido para este livro
      </p>
    )
  }

  return (
    <div>
      {erro && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 
                        rounded-xl p-2.5 mb-2 text-xs">
          <AlertCircle size={14} />
          {erro}
        </div>
      )}
      <button
        onClick={handleSolicitar}
        disabled={loading}
        className="btn-secondary w-full text-sm"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? 'Solicitando...' : 'Pedir avaliação da IA'}
      </button>
      <p className="text-xs text-gray-400 text-center mt-1.5">
        {tentativasRestantes} {tentativasRestantes === 1 ? 'tentativa restante' : 'tentativas restantes'}
      </p>
    </div>
  )
}
