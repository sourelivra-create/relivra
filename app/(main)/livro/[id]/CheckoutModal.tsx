'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'

declare global {
  interface Window {
    MercadoPago: any
  }
}

interface CheckoutModalProps {
  orderId: string
  preferenceId: string
  valorTotal: number
  publicKey: string
  payerEmail: string
  onClose: () => void
  onSucesso: () => void
}

type EstadoPagamento = 'carregando' | 'formulario' | 'processando' | 'aprovado' | 'pix_gerado' | 'erro'

export default function CheckoutModal({
  orderId,
  preferenceId,
  valorTotal,
  publicKey,
  payerEmail,
  onClose,
  onSucesso,
}: CheckoutModalProps) {
  const brickControllerRef = useRef<any>(null)
  const [estado, setEstado] = useState<EstadoPagamento>('carregando')
  const [erro, setErro] = useState('')
  const [pixCode, setPixCode] = useState('')
  const [pixCodeBase64, setPixCodeBase64] = useState('')
  const [copiado, setCopiado] = useState(false)

  // Carrega o SDK do Mercado Pago e monta o Payment Brick
  useEffect(() => {
    let cancelado = false

    async function montarBrick() {
      // Limpa qualquer Brick anterior que possa ter ficado no container
      // (acontece em desenvolvimento, onde o React monta o efeito 2x)
      const containerExistente = document.getElementById('payment-brick-container')
      if (containerExistente) containerExistente.innerHTML = ''

      // Carrega o SDK se ainda não estiver na página
      if (!window.MercadoPago) {
        const scriptTag = document.createElement('script')
        scriptTag.src = 'https://sdk.mercadopago.com/js/v2'
        document.body.appendChild(scriptTag)
        await new Promise(resolve => { scriptTag.onload = resolve })
      }

      // Se o componente já foi desmontado enquanto carregava o SDK,
      // não monta o Brick — evita o controller "fantasma"
      if (cancelado) return

      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' })
      const bricksBuilder = mp.bricks()

      const controller = await bricksBuilder.create('payment', 'payment-brick-container', {
        initialization: {
          amount: valorTotal,
          preferenceId,
          payer: { email: payerEmail },
        },
        customization: {
          paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            bankTransfer: 'all', // Pix
          },
        },
        callbacks: {
          onReady: () => setEstado('formulario'),
          onSubmit: async (formData: any) => {
            setEstado('processando')
            try {
              const res = await fetch('/api/pagamento/processar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, formData }),
              })
              const data = await res.json()

              if (!res.ok) throw new Error(data.error || 'Erro ao processar')

              if (data.status === 'approved') {
                setEstado('aprovado')
                setTimeout(() => onSucesso(), 1800)
              } else if (data.qr_code) {
                // Pix gerado — mostra QR code e código copia-e-cola
                setPixCode(data.qr_code)
                setPixCodeBase64(data.qr_code_base64)
                setEstado('pix_gerado')
              } else {
                setEstado('erro')
                setErro('Pagamento pendente ou não aprovado. Tente outro método.')
              }
            } catch (err) {
              setEstado('erro')
              setErro('Não foi possível processar o pagamento. Tente novamente.')
            }
          },
          onError: (err: any) => {
            console.error('[Payment Brick]', err)
            setEstado('erro')
            setErro('Erro ao carregar o formulário de pagamento.')
          },
        },
      })

      // Se cancelou enquanto o Brick terminava de montar, desmonta
      // imediatamente para não deixar formulário duplicado na tela
      if (cancelado) {
        controller?.unmount?.()
        return
      }

      brickControllerRef.current = controller
    }

    montarBrick()

    return () => {
      cancelado = true
      brickControllerRef.current?.unmount?.()
    }
  }, [])

  const copiarPix = () => {
    navigator.clipboard.writeText(pixCode)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-float">
        {/* Header do modal */}
        <div className="flex items-center justify-between p-5 border-b border-areia-200">
          <div>
            <p className="font-display font-bold text-lg text-grafite">Finalizar compra</p>
            <p className="text-sm text-gray-400">{formatarMoeda(valorTotal)}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* Estados especiais (aprovado, pix, erro) sobrepõem o Brick */}
          {estado === 'aprovado' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-verde-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-verde-600" />
              </div>
              <p className="font-display font-bold text-lg text-grafite">Pagamento aprovado!</p>
              <p className="text-sm text-gray-400 mt-1">Redirecionando...</p>
            </div>
          )}

          {estado === 'pix_gerado' && (
            <div className="text-center py-4">
              <p className="font-semibold text-grafite mb-3">Escaneie o QR Code ou copie o código</p>
              {pixCodeBase64 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${pixCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-48 h-48 mx-auto rounded-xl border border-areia-200"
                />
              )}
              <button
                onClick={copiarPix}
                className="btn-secondary w-full mt-4 gap-2"
              >
                {copiado ? <Check size={16} className="text-verde-600" /> : <Copy size={16} />}
                {copiado ? 'Copiado!' : 'Copiar código Pix'}
              </button>
              <p className="text-xs text-gray-400 mt-3">
                Após pagar, a confirmação pode levar alguns segundos.
              </p>
            </div>
          )}

          {estado === 'erro' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {erro}
            </div>
          )}

          {estado === 'processando' && (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-4">
              <Loader2 size={18} className="animate-spin" />
              Processando pagamento...
            </div>
          )}

          {/* Container do Brick — sempre presente no DOM, só escondido
              visualmente quando outro estado está em destaque */}
          <div
            id="payment-brick-container"
            className={estado === 'aprovado' || estado === 'pix_gerado' ? 'hidden' : ''}
          />

          {estado === 'carregando' && (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-12">
              <Loader2 size={18} className="animate-spin" />
              Carregando formulário de pagamento...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
