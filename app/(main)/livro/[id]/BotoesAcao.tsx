'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ArrowLeftRight, Loader2, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import CheckoutModal from './CheckoutModal'

interface BotoesAcaoProps {
  livroId: string
  aceitaTroca: boolean
  userId: string | null
  vendedorId: string
  quantidadeDisponivel: number
}

interface DadosCheckout {
  order_id: string
  preference_id: string
  valor_total: number
  public_key: string
  payer_email: string
}

export default function BotoesAcao({ livroId, aceitaTroca, userId, vendedorId, quantidadeDisponivel }: BotoesAcaoProps) {
  const router = useRouter()
  const [comprando, setComprando] = useState(false)
  const [quantidade, setQuantidade] = useState(1)
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
        body: JSON.stringify({ livro_ids: [livroId], quantidade }),
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
        {/* Seletor de quantidade — só aparece se houver mais de 1
            cópia disponível desse anúncio */}
        {quantidadeDisponivel > 1 && (
          <div className="flex items-center justify-between bg-areia-50 border border-areia-200 rounded-xl p-3">
            <span className="text-sm text-gray-600">Quantidade</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                disabled={quantidade <= 1}
                className="w-8 h-8 rounded-lg bg-white border border-areia-300 flex items-center justify-center disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <span className="font-semibold text-grafite w-6 text-center">{quantidade}</span>
              <button
                onClick={() => setQuantidade(q => Math.min(quantidadeDisponivel, q + 1))}
                disabled={quantidade >= quantidadeDisponivel}
                className="w-8 h-8 rounded-lg bg-white border border-areia-300 flex items-center justify-center disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

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
