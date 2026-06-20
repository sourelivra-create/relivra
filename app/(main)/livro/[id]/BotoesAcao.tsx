'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ArrowLeftRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface BotoesAcaoProps {
  livroId: string
  aceitaTroca: boolean
  userId: string | null
  vendedorId: string
}

export default function BotoesAcao({ livroId, aceitaTroca, userId, vendedorId }: BotoesAcaoProps) {
  const router = useRouter()
  const [comprando, setComprando] = useState(false)

  const handleComprar = async () => {
    if (!userId) {
      router.push(`/login?redirect=/livro/${livroId}`)
      return
    }

    setComprando(true)
    try {
      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ livro_ids: [livroId] }),
      })

      const data = await res.json()
      if (data.init_point) {
        window.location.href = data.init_point
      }
    } catch {
      alert('Erro ao processar compra. Tente novamente.')
    } finally {
      setComprando(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleComprar}
        disabled={comprando}
        className="btn-primary w-full text-base py-3"
      >
        {comprando ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ShoppingCart size={18} />
        )}
        {comprando ? 'Processando...' : 'Comprar agora'}
      </button>

      {aceitaTroca && (
        <Link
          href={userId
            ? `/trocar?livro=${livroId}&receptor=${vendedorId}`
            : `/login?redirect=/trocar?livro=${livroId}`
          }
          className="btn-secondary w-full text-base py-3"
        >
          <ArrowLeftRight size={18} />
          Propor troca
        </Link>
      )}

      <p className="text-xs text-center text-gray-400">
        📦 Entrega combinada entre as partes
      </p>
    </div>
  )
}
