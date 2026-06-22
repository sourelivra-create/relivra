'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ArrowLeftRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import CheckoutModal from './CheckoutModal'

interface BotoesAcaoProps {
  livroId: string
  aceitaTroca: boolean
  userId: string | null
  vendedorId: string
}

interface DadosCheckout {
  order_id: string
  preference_id: string
  valor_total: number
  public_key: string
  payer_email: string
}

export default function BotoesAcao({ livroId, aceitaTroca, userId, vendedorId }: BotoesAcaoProps) {
  const router = useRouter()
  const [comprando, setComprando] = useState(false)
  const [dadosCheckout, setDadosCheckout] = useState<DadosCheckout | null>(null)

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
      if (!res.ok) throw new Error(data.error)

      // Em vez de redirecionar, abre o checkout embutido no próprio site
      setDadosCheckout(data)
    } catch {
      alert('Erro ao processar compra. Tente novamente.')
    } finally {
      setComprando(false)
    }
  }

  const handleSucessoPagamento = () => {
    setDadosCheckout(null)
    router.push('/painel/vendas?status=sucesso')
    router.refresh()
  }

  return (
    <>
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
          {comprando ? 'Preparando...' : 'Comprar agora'}
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

      {/* Checkout embutido — abre direto no site, sem redirecionar */}
      {dadosCheckout && (
        <CheckoutModal
          orderId={dadosCheckout.order_id}
          preferenceId={dadosCheckout.preference_id}
          valorTotal={dadosCheckout.valor_total}
          publicKey={dadosCheckout.public_key}
          payerEmail={dadosCheckout.payer_email}
          onClose={() => setDadosCheckout(null)}
          onSucesso={handleSucessoPagamento}
        />
      )}
    </>
  )
}
