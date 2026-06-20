'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
        <AlertTriangle size={36} className="text-red-400" />
      </div>
      <h2 className="font-display text-2xl font-bold text-grafite">Algo deu errado</h2>
      <p className="text-gray-400 mt-2 max-w-xs text-sm">
        Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.
      </p>
      <div className="flex gap-3 mt-8">
        <button onClick={reset} className="btn-secondary">
          Tentar novamente
        </button>
        <Link href="/" className="btn-primary">
          Início
        </Link>
      </div>
    </div>
  )
}
