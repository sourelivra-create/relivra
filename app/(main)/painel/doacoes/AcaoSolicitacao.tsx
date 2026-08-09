'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AcaoSolicitacaoProps {
  solicitacaoId: string
  acao: 'ACEITAR' | 'RECUSAR' | 'CANCELAR'
  label: string
  variante?: 'primary' | 'secondary' | 'danger'
}

export default function AcaoSolicitacao({ solicitacaoId, acao, label, variante = 'secondary' }: AcaoSolicitacaoProps) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const handleClick = async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/doacoes/responder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitacao_id: solicitacaoId, acao }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Erro ao processar')
        setCarregando(false)
        return
      }
      router.refresh()
    } catch {
      setErro('Erro de conexão')
      setCarregando(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={carregando}
        className={cn(
          'text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60',
          variante === 'primary' && 'bg-verde-500 text-white hover:bg-verde-600',
          variante === 'secondary' && 'border border-areia-300 text-grafite hover:bg-areia-50',
          variante === 'danger' && 'border border-red-200 text-red-600 hover:bg-red-50'
        )}
      >
        {carregando ? <Loader2 size={12} className="animate-spin inline" /> : label}
      </button>
      {erro && <p className="text-[10px] text-red-500 mt-1">{erro}</p>}
    </div>
  )
}
