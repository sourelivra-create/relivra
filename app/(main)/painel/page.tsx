import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatarMoeda, formatarData } from '@/lib/utils'
import { BookOpen, ArrowLeftRight, ShoppingBag, Plus, TrendingUp, Clock } from 'lucide-react'

export default async function PainelPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Buscar dados em paralelo
  const [
    { count: totalLivros },
    { count: livrosVendidos },
    { count: trocasPendentes },
    { data: ultimosLivros },
    { data: ultimasTrocas },
    { data: transacoes },
  ] = await Promise.all([
    supabase.from('books').select('*', { count: 'exact', head: true })
      .eq('vendedor_id', user!.id).eq('vendido', false),

    supabase.from('books').select('*', { count: 'exact', head: true })
      .eq('vendedor_id', user!.id).eq('vendido', true),

    supabase.from('trocas').select('*', { count: 'exact', head: true })
      .or(`solicitante_id.eq.${user!.id},receptor_id.eq.${user!.id}`)
      .eq('status', 'PENDENTE'),

    supabase.from('books').select('id, titulo, preco, estado, vendido, created_at')
      .eq('vendedor_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(3),

    supabase.from('trocas').select('id, status, created_at, valor_total_receptor, valor_total_solicitante')
      .or(`solicitante_id.eq.${user!.id},receptor_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
      .limit(3),

    supabase.from('transactions').select('valor, tipo, created_at')
      .eq('vendedor_id', user!.id)
      .eq('status', 'PAGO')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalGanho = (transacoes || []).reduce((acc, t) => acc + Number(t.valor), 0)

  const cards = [
    {
      label: 'Livros à venda',
      valor: totalLivros || 0,
      icon: BookOpen,
      href: '/painel/meus-livros',
      cor: 'bg-verde-50 text-verde-600',
    },
    {
      label: 'Livros vendidos',
      valor: livrosVendidos || 0,
      icon: ShoppingBag,
      href: '/painel/vendas',
      cor: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Trocas pendentes',
      valor: trocasPendentes || 0,
      icon: ArrowLeftRight,
      href: '/painel/trocas',
      cor: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total ganho',
      valor: formatarMoeda(totalGanho),
      icon: TrendingUp,
      href: '/painel/vendas',
      cor: 'bg-purple-50 text-purple-600',
    },
  ]

  const STATUS_TROCA: Record<string, string> = {
    PENDENTE:   '🕐 Pendente',
    ACEITA:     '✅ Aceita',
    RECUSADA:   '❌ Recusada',
    FINALIZADA: '🎉 Finalizada',
    CANCELADA:  '🚫 Cancelada',
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(card => (
          <Link key={card.label} href={card.href} className="card p-4 hover:shadow-card-hover">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.cor}`}>
              <card.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-grafite">{card.valor}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Ação rápida */}
      <Link
        href="/vender"
        className="flex items-center gap-3 p-4 bg-verde-500 hover:bg-verde-600 
                   rounded-2xl text-white transition-colors group"
      >
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center 
                        group-hover:bg-white/30 transition-colors">
          <Plus size={20} />
        </div>
        <div>
          <p className="font-semibold">Publicar novo livro</p>
          <p className="text-verde-100 text-xs">A IA analisa e precifica automaticamente</p>
        </div>
      </Link>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Últimos livros */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">Meus livros recentes</h3>
            <Link href="/painel/meus-livros" className="text-xs text-verde-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {!ultimosLivros?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum livro publicado ainda</p>
          ) : (
            <div className="space-y-2.5">
              {ultimosLivros.map((livro: any) => (
                <Link
                  key={livro.id}
                  href={`/livro/${livro.id}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 bg-areia-100 rounded-lg flex items-center justify-center shrink-0">
                    <BookOpen size={14} className="text-areia-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-verde-600">
                      {livro.titulo}
                    </p>
                    <p className="text-xs text-gray-400">{formatarData(livro.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-verde-600">{formatarMoeda(livro.preco)}</p>
                    {livro.vendido && (
                      <p className="text-xs text-gray-400">Vendido</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Últimas trocas */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">Trocas recentes</h3>
            <Link href="/painel/trocas" className="text-xs text-verde-600 hover:underline">
              Ver todas
            </Link>
          </div>
          {!ultimasTrocas?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhuma troca ainda</p>
          ) : (
            <div className="space-y-2.5">
              {ultimasTrocas.map((troca: any) => (
                <div key={troca.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-areia-100 rounded-lg flex items-center justify-center shrink-0">
                    <ArrowLeftRight size={14} className="text-areia-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {STATUS_TROCA[troca.status] || troca.status}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatarData(troca.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
