import { createAdminClient } from '@/lib/supabase/server'
import { formatarMoeda, formatarData, cn } from '@/lib/utils'
import { Clock, CheckCircle2, DollarSign, XCircle } from 'lucide-react'

const STATUS_INFO: Record<string, { label: string; icon: typeof Clock; cor: string }> = {
  PENDENTE:   { label: 'Pendente',   icon: Clock,        cor: 'bg-amber-100 text-amber-700' },
  DISPONIVEL: { label: 'Disponível', icon: CheckCircle2, cor: 'bg-verde-100 text-verde-700' },
  PAGO:       { label: 'Pago',       icon: DollarSign,   cor: 'bg-gray-100 text-gray-600' },
  REVERTIDO:  { label: 'Revertido',  icon: XCircle,      cor: 'bg-red-100 text-red-700' },
}

export default async function TransacoesPage() {
  const supabase = createAdminClient()

  const { data: transacoes } = await supabase
    .from('ledger_financeiro')
    .select('*, vendedor:profiles!vendedor_id(nome), book:books(titulo)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <h2 className="font-display font-bold text-xl mb-4">Transações</h2>

      {!transacoes?.length ? (
        <p className="text-gray-400 text-center py-12">Nenhuma transação ainda</p>
      ) : (
        <div className="space-y-2">
          {transacoes.map((t: any) => {
            const status = STATUS_INFO[t.status] || STATUS_INFO.PENDENTE
            const Icon = status.icon
            return (
              <div key={t.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-grafite truncate">{t.book?.titulo}</p>
                  <p className="text-xs text-gray-400">
                    Vendedor: {t.vendedor?.nome} · {formatarData(t.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-grafite">{formatarMoeda(t.valor_bruto)}</p>
                  <p className="text-xs text-gray-400">
                    líquido: {formatarMoeda(t.valor_liquido_vendedor)}
                  </p>
                </div>
                <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0', status.cor)}>
                  <Icon size={12} />
                  {status.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
