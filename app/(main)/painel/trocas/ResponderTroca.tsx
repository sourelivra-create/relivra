'use client'

import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ResponderTroca({ trocaId }: { trocaId: string }) {
  const [loading, setLoading] = useState<'aceitar' | 'recusar' | null>(null)
  const router = useRouter()

  const responder = async (acao: 'ACEITAR' | 'RECUSAR') => {
    setLoading(acao === 'ACEITAR' ? 'aceitar' : 'recusar')
    try {
      const res = await fetch('/api/trocas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ troca_id: trocaId, acao }),
      })
      if (res.ok) router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => responder('ACEITAR')}
        disabled={!!loading}
        className="btn-primary flex-1 py-2 text-sm"
      >
        {loading === 'aceitar' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        Aceitar troca
      </button>
      <button
        onClick={() => responder('RECUSAR')}
        disabled={!!loading}
        className="btn-secondary flex-1 py-2 text-sm text-red-500 hover:bg-red-50"
      >
        {loading === 'recusar' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
        Recusar
      </button>
    </div>
  )
}
