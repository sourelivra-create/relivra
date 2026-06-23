'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, Wallet } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'

interface VendedorCardProps {
  vendedorId: string
  nome: string
  chavePix: string | null
  tipoChavePix: string | null
  disponivel: number
  pendente: number
  pago: number
  ativo: boolean
}

export default function VendedorCard({
  vendedorId, nome, chavePix, tipoChavePix, disponivel, pendente, pago, ativo,
}: VendedorCardProps) {
  const router = useRouter()
  const [pagando, setPagando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const handlePagar = async () => {
    if (pagando) return

    setPagando(true)
    try {
      const res = await fetch('/api/master/pagar-vendedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendedor_id: vendedorId }),
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Erro ao processar repasse')
        return
      }

      router.refresh()
    } finally {
      setPagando(false)
      setConfirmando(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-grafite">{nome}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              ativo ? 'bg-verde-100 text-verde-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          {chavePix ? (
            <p className="text-xs text-gray-400">
              Pix ({tipoChavePix}): {chavePix}
            </p>
          ) : (
            <p className="text-xs text-red-500">Sem chave Pix cadastrada</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 text-center">
        <div>
          <p className="text-xs text-gray-400">Pendente</p>
          <p className="text-sm font-semibold text-amber-600">{formatarMoeda(pendente)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Disponível</p>
          <p className="text-sm font-semibold text-verde-deep">{formatarMoeda(disponivel)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Pago</p>
          <p className="text-sm font-semibold text-gray-500">{formatarMoeda(pago)}</p>
        </div>
      </div>

      {disponivel > 0 && (
        confirmando ? (
          <div className="flex gap-2">
            <button onClick={handlePagar} disabled={pagando} className="btn-primary flex-1 text-sm py-2">
              {pagando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {pagando ? 'Processando...' : `Confirmar pagamento de ${formatarMoeda(disponivel)}`}
            </button>
            <button onClick={() => setConfirmando(false)} className="btn-secondary text-sm py-2">
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmando(true)} className="btn-secondary w-full text-sm py-2">
            <Wallet size={14} />
            Pagar vendedor
          </button>
        )
      )}
    </div>
  )
}
