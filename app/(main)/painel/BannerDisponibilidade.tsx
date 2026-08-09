'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Loader2, X } from 'lucide-react'

interface LivroLembrete {
  id: string
  titulo: string
}

export default function BannerDisponibilidade({ livros }: { livros: LivroLembrete[] }) {
  const router = useRouter()
  const [processando, setProcessando] = useState<string | null>(null)
  const [resolvidos, setResolvidos] = useState<Set<string>>(new Set())

  const responder = async (bookId: string, acao: 'DISPONIVEL' | 'INDISPONIVEL') => {
    setProcessando(bookId)
    try {
      const res = await fetch('/api/livros/confirmar-disponibilidade', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId, acao }),
      })
      if (res.ok) {
        setResolvidos(prev => new Set(prev).add(bookId))
        router.refresh()
      }
    } finally {
      setProcessando(null)
    }
  }

  const pendentes = livros.filter(l => !resolvidos.has(l.id))
  if (pendentes.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={16} className="text-amber-700" />
        <p className="font-semibold text-sm text-amber-900">
          {pendentes.length === 1
            ? 'Este anúncio está no ar há mais de 30 dias'
            : `${pendentes.length} anúncios estão no ar há mais de 30 dias`}
        </p>
      </div>

      <div className="space-y-2">
        {pendentes.map(livro => (
          <div key={livro.id} className="flex items-center justify-between gap-3 bg-white rounded-xl p-3">
            <p className="text-sm text-gray-700 truncate flex-1">{livro.titulo}</p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => responder(livro.id, 'DISPONIVEL')}
                disabled={processando === livro.id}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-verde-500 text-white hover:bg-verde-600 disabled:opacity-60"
              >
                {processando === livro.id ? <Loader2 size={12} className="animate-spin" /> : 'Ainda disponível'}
              </button>
              <button
                onClick={() => responder(livro.id, 'INDISPONIVEL')}
                disabled={processando === livro.id}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-areia-300 text-gray-600 hover:bg-areia-50 disabled:opacity-60"
              >
                Já não tenho mais
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
