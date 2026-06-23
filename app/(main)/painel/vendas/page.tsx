import { createClient } from '@/lib/supabase/server'
import { formatarMoeda, formatarData, cn } from '@/lib/utils'
import { ShoppingBag, TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react'
import ConfirmarRecebimento from './ConfirmarRecebimento'

const STATUS_ORDER: Record<string, { label: string; icon: typeof CheckCircle2; cor: string }> = {
  PENDENTE:  { label: 'Pendente',  icon: Clock,         cor: 'text-amber-500' },
  PAGO:      { label: 'Pago',      icon: CheckCircle2,  cor: 'text-verde-600' },
  CANCELADO: { label: 'Cancelado', icon: XCircle,       cor: 'text-red-500'   },
  ENTREGUE:  { label: 'Entregue',  icon: CheckCircle2,  cor: 'text-verde-700' },
}

export default async function VendasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Buscar vendas onde o usuário é o vendedor de algum item
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, order:orders(id, status, tipo, created_at, comprador:profiles!comprador_id(nome))')
    .eq('vendedor_id', user!.id)
    .order('created_at', { ascending: false })

  // Buscar ordens onde o usuário é o comprador
  const { data: compras } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        book:books(titulo, autor, imagem_url, vendedor_id, vendedor:profiles(nome))
      )
    `)
    .eq('comprador_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const totalRecebido = (transactions || [])
    .filter(t => t.status === 'PAGO')
    .reduce((acc, t) => acc + Number(t.valor), 0)

  const totalVendas = (transactions || []).filter(t => t.status === 'PAGO').length

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="w-9 h-9 bg-verde-50 text-verde-600 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={18} />
          </div>
          <p className="text-2xl font-bold text-grafite">{formatarMoeda(totalRecebido)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total recebido</p>
        </div>
        <div className="card p-4">
          <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
            <ShoppingBag size={18} />
          </div>
          <p className="text-2xl font-bold text-grafite">{totalVendas}</p>
          <p className="text-xs text-gray-500 mt-0.5">Livros vendidos</p>
        </div>
      </div>

      {/* Minhas vendas (como vendedor) */}
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Minhas vendas</h3>
        {!transactions?.length ? (
          <div className="card p-8 text-center text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 text-areia-300" />
            <p className="font-medium">Nenhuma venda ainda</p>
            <p className="text-sm mt-1">Quando alguém comprar seu livro, aparece aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((t: any) => {
              const order = t.order
              const statusInfo = STATUS_ORDER[order?.status] || STATUS_ORDER.PENDENTE
              const Icon = statusInfo.icon
              return (
                <div key={t.id} className="card p-4 flex items-center gap-4">
                  <div className={cn('shrink-0', statusInfo.cor)}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {t.descricao || 'Venda de livro'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order?.comprador?.nome && `Comprador: ${order.comprador.nome} · `}
                      {formatarData(t.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-verde-600">{formatarMoeda(t.valor)}</p>
                    <p className={cn('text-xs font-medium', statusInfo.cor)}>
                      {statusInfo.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Minhas compras */}
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Minhas compras</h3>
        {!compras?.length ? (
          <div className="card p-8 text-center text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 text-areia-300" />
            <p className="font-medium">Nenhuma compra ainda</p>
            <p className="text-sm mt-1">
              <a href="/" className="text-verde-600 hover:underline">Explorar livros disponíveis</a>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {compras.map((order: any) => {
              const statusInfo = STATUS_ORDER[order.status] || STATUS_ORDER.PENDENTE
              const Icon = statusInfo.icon
              const itens = order.order_items || []
              return (
                <div key={order.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={statusInfo.cor} />
                      <span className={cn('text-xs font-semibold', statusInfo.cor)}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">
                        {order.tipo}
                      </span>
                    </div>
                    <p className="font-bold text-gray-800">{formatarMoeda(order.valor_total)}</p>
                  </div>
                  <div className="space-y-1">
                    {itens.map((item: any) => (
                      <p key={item.id} className="text-xs text-gray-600 truncate">
                        📚 {item.book?.titulo} — {item.book?.autor}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{formatarData(order.created_at)}</p>

                  {/* Botão de confirmação — só aparece para pedidos pagos
                      ainda não confirmados como entregues */}
                  {order.status === 'PAGO' && itens[0]?.book?.vendedor_id && (
                    <ConfirmarRecebimento
                      orderId={order.id}
                      vendedorId={itens[0].book.vendedor_id}
                      vendedorNome={itens[0].book.vendedor?.nome || 'o vendedor'}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
