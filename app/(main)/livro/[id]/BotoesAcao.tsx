'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ArrowLeftRight, Loader2, Minus, Plus, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import CheckoutModal from './CheckoutModal'
import BotaoPedirDoacao from '@/components/doacoes/BotaoPedirDoacao'
import type { DestinoLivro } from '@/types/database.types'

interface DadosCheckout {
  preferenceId: string
  orderId: string
  valorTotal: number
  publicKey: string
  payerEmail: string
}

interface BotoesAcaoProps {
  livroId: string
  aceitaTroca: boolean
  userId: string | null
  vendedorId: string
  quantidadeDisponivel: number
  destino: DestinoLivro
}

export default function BotoesAcao({ livroId, aceitaTroca, userId, vendedorId, quantidadeDisponivel, destino }: BotoesAcaoProps) {
  const router = useRouter()
  const [comprando, setComprando] = useState(false)
  const [quantidade, setQuantidade] = useState(1)
  const [dadosCheckout, setDadosCheckout] = useState<DadosCheckout | null>(null)
  const [iniciandoConversa, setIniciandoConversa] = useState(false)

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
      if (!res.ok) {
        console.error(data.error)
        return
      }
      setDadosCheckout({
        preferenceId: data.preference_id,
        orderId: data.order_id,
        valorTotal: data.valor_total,
        publicKey: data.public_key,
        payerEmail: data.payer_email,
      })
    } finally {
      setComprando(false)
    }
  }

  const handleEntrarEmContato = async () => {
    if (!userId) {
      router.push(`/login?redirect=/livro/${livroId}`)
      return
    }
    setIniciandoConversa(true)
    try {
      const res = await fetch('/api/mensagens/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: livroId }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error(data.error)
        return
      }
      router.push(`/painel/mensagens/${data.id}`)
    } finally {
      setIniciandoConversa(false)
    }
  }

  return (
    <>
      <div className="space-y-3">
        {destino === 'DOACAO' ? (
          <BotaoPedirDoacao
            bookId={livroId}
            userId={userId}
            isProprioLivro={false}
            jaSolicitado={false}
          />
        ) : (
          <>
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
          </>
        )}

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

        <button
          onClick={handleEntrarEmContato}
          disabled={iniciandoConversa}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium
                     text-grafite-light hover:text-grafite border border-areia-300
                     hover:border-areia-400 rounded-xl py-2.5 transition-colors"
        >
          {iniciandoConversa ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
          Entrar em contato com vendedor
        </button>

        <p className="text-xs text-center text-gray-400">
          📦 Entrega combinada entre as partes
        </p>
      </div>

      {dadosCheckout && (
        <CheckoutModal
          preferenceId={dadosCheckout.preferenceId}
          orderId={dadosCheckout.orderId}
          valorTotal={dadosCheckout.valorTotal}
          publicKey={dadosCheckout.publicKey}
          payerEmail={dadosCheckout.payerEmail}
          onClose={() => setDadosCheckout(null)}
          onSucesso={() => {
            setDadosCheckout(null)
            router.push('/painel/vendas')
          }}
        />
      )}
    </>
  )
}
