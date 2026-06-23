'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, X, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatarMoeda, cn } from '@/lib/utils'
import type { TipoDesconto } from '@/types/database.types'

interface GerenciarDescontoProps {
  bookId: string
  preco: number
  tipoDescontoAtual: TipoDesconto | null
  valorDescontoAtual: number | null
}

export default function GerenciarDesconto({
  bookId,
  preco,
  tipoDescontoAtual,
  valorDescontoAtual,
}: GerenciarDescontoProps) {
  const router = useRouter()
  const supabase = createClient()
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<TipoDesconto>(tipoDescontoAtual || 'PERCENTUAL')
  const [valor, setValor] = useState(valorDescontoAtual ? String(valorDescontoAtual) : '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const temDescontoAtivo = !!tipoDescontoAtual && !!valorDescontoAtual

  const valorNum = Number(valor) || 0
  const precoFinalPreview = tipo === 'PERCENTUAL'
    ? preco * (1 - Math.min(valorNum, 100) / 100)
    : Math.max(preco - valorNum, 0)

  const valido = valorNum > 0 && (
    tipo === 'PERCENTUAL' ? valorNum <= 100 : valorNum <= preco
  )

  const handleSalvar = async () => {
    if (!valido) {
      setErro(tipo === 'PERCENTUAL' ? 'Percentual deve ser entre 1 e 100' : 'Desconto não pode ser maior que o preço')
      return
    }
    setLoading(true)
    setErro('')

    const { error } = await supabase
      .from('books')
      .update({ tipo_desconto: tipo, valor_desconto: valorNum })
      .eq('id', bookId)

    if (error) {
      setErro('Erro ao salvar desconto. Tente novamente.')
      setLoading(false)
      return
    }

    setAberto(false)
    setLoading(false)
    router.refresh()
  }

  const handleRemover = async () => {
    setLoading(true)
    await supabase
      .from('books')
      .update({ tipo_desconto: null, valor_desconto: null })
      .eq('id', bookId)

    setValor('')
    setAberto(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className={cn('btn-ghost p-2', temDescontoAtivo && 'text-red-500')}
        title={temDescontoAtivo ? 'Editar desconto' : 'Aplicar desconto'}
      >
        <Tag size={16} />
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-float">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-bold text-lg text-grafite">Aplicar desconto</p>
              <button onClick={() => setAberto(false)} className="btn-ghost p-1.5 text-gray-400">
                <X size={18} />
              </button>
            </div>

            {erro && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200
                              rounded-xl p-3 mb-4 text-sm">
                <AlertCircle size={14} className="shrink-0" />
                {erro}
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTipo('PERCENTUAL')}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium border transition-colors',
                  tipo === 'PERCENTUAL' ? 'bg-verde-deep text-white border-verde-deep' : 'bg-white text-gray-500 border-areia-200'
                )}
              >
                Percentual (%)
              </button>
              <button
                onClick={() => setTipo('VALOR_FIXO')}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium border transition-colors',
                  tipo === 'VALOR_FIXO' ? 'bg-verde-deep text-white border-verde-deep' : 'bg-white text-gray-500 border-areia-200'
                )}
              >
                Valor fixo (R$)
              </button>
            </div>

            <div className="mb-4">
              <label className="label">
                {tipo === 'PERCENTUAL' ? 'Percentual de desconto' : 'Valor do desconto'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  {tipo === 'PERCENTUAL' ? '%' : 'R$'}
                </span>
                <input
                  type="number"
                  className="input pl-9"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder={tipo === 'PERCENTUAL' ? '10' : '5.00'}
                  min={0}
                  max={tipo === 'PERCENTUAL' ? 100 : preco}
                  step={tipo === 'PERCENTUAL' ? 1 : 0.5}
                />
              </div>
            </div>

            {valorNum > 0 && (
              <div className="bg-areia-50 border border-areia-200 rounded-xl p-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">Preço com desconto:</span>
                <div className="text-right">
                  <p className="text-xs text-gray-400 line-through">{formatarMoeda(preco)}</p>
                  <p className="font-bold text-verde-600">{formatarMoeda(precoFinalPreview)}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {temDescontoAtivo && (
                <button onClick={handleRemover} disabled={loading} className="btn-secondary flex-1 text-red-500">
                  Remover
                </button>
              )}
              <button onClick={handleSalvar} disabled={loading || !valido} className="btn-primary flex-1">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
