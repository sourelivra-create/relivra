import { createAdminClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/utils'
import { TrendingUp, Clock, CheckCircle2, Wallet } from 'lucide-react'

export default async function MasterPage() {
  const supabase = createAdminClient()

  const { data: ledger } = await supabase
    .from('ledger_financeiro')
    .select('status, valor_bruto, taxa_mercado_pago, taxa_relivra, valor_liquido_vendedor')

  const entradas = ledger || []

  const totalVendido = entradas.reduce((acc, e) => acc + Number(e.valor_bruto), 0)
  const totalTaxasRelivra = entradas.reduce((acc, e) => acc + Number(e.taxa_relivra), 0)
  const totalPendente = entradas
    .filter(e => e.status === 'PENDENTE')
    .reduce((acc, e) => acc + Number(e.valor_liquido_vendedor), 0)
  const totalDisponivel = entradas
    .filter(e => e.status === 'DISPONIVEL')
    .reduce((acc, e) => acc + Number(e.valor_liquido_vendedor), 0)
  const totalPago = entradas
    .filter(e => e.status === 'PAGO')
    .reduce((acc, e) => acc + Number(e.valor_liquido_vendedor), 0)

  const cards = [
    { label: 'Total vendido (bruto)', valor: totalVendido, icon: TrendingUp, cor: 'bg-blue-50 text-blue-600' },
    { label: 'Taxas Relivra (lucro)', valor: totalTaxasRelivra, icon: Wallet, cor: 'bg-verde-50 text-verde-600' },
    { label: 'Pendente (sem confirmação)', valor: totalPendente, icon: Clock, cor: 'bg-amber-50 text-amber-600' },
    { label: 'Disponível para repasse', valor: totalDisponivel, icon: CheckCircle2, cor: 'bg-purple-50 text-purple-600' },
    { label: 'Já repassado', valor: totalPago, icon: CheckCircle2, cor: 'bg-gray-50 text-gray-600' },
  ]

  return (
    <div>
      <h2 className="font-display font-bold text-xl mb-4">Visão geral</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {cards.map(card => (
          <div key={card.label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.cor}`}>
              <card.icon size={18} />
            </div>
            <p className="text-xl font-bold text-grafite">{formatarMoeda(card.valor)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {totalDisponivel > 0 && (
        <div className="bg-verde-50 border border-verde-100 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-sm text-grafite">
            Há <strong>{formatarMoeda(totalDisponivel)}</strong> disponível para repasse a vendedores.
          </p>
          <a href="/master/vendedores" className="btn-primary text-sm">
            Ver vendedores
          </a>
        </div>
      )}
    </div>
  )
}
