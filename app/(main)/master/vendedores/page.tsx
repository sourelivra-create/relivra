import { createAdminClient } from '@/lib/supabase/server'
import VendedorCard from './VendedorCard'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const DIAS_PARA_ATIVO = 30

interface VendedoresPageProps {
  searchParams: { filtro?: string }
}

export default async function VendedoresPage({ searchParams }: VendedoresPageProps) {
  const supabase = createAdminClient()

  const { data: ledger } = await supabase
    .from('ledger_financeiro')
    .select('vendedor_id, status, valor_liquido_vendedor, created_at, vendedor:profiles!vendedor_id(nome, chave_pix, tipo_chave_pix)')

  const entradas = ledger || []

  const porVendedor = new Map<string, {
    nome: string
    chavePix: string | null
    tipoChavePix: string | null
    disponivel: number
    pendente: number
    pago: number
    ultimaVenda: string
  }>()

  for (const e of entradas) {
    const vendedor = e.vendedor as any
    if (!porVendedor.has(e.vendedor_id)) {
      porVendedor.set(e.vendedor_id, {
        nome: vendedor?.nome || 'Desconhecido',
        chavePix: vendedor?.chave_pix || null,
        tipoChavePix: vendedor?.tipo_chave_pix || null,
        disponivel: 0,
        pendente: 0,
        pago: 0,
        ultimaVenda: e.created_at,
      })
    }
    const agregado = porVendedor.get(e.vendedor_id)!
    const valor = Number(e.valor_liquido_vendedor)
    if (e.status === 'DISPONIVEL') agregado.disponivel += valor
    if (e.status === 'PENDENTE') agregado.pendente += valor
    if (e.status === 'PAGO') agregado.pago += valor
    // Mantém a venda mais recente
    if (new Date(e.created_at) > new Date(agregado.ultimaVenda)) {
      agregado.ultimaVenda = e.created_at
    }
  }

  const agora = Date.now()
  const limiteAtivo = DIAS_PARA_ATIVO * 24 * 60 * 60 * 1000

  let vendedores = Array.from(porVendedor.entries())
    .map(([id, dados]) => ({
      id,
      ...dados,
      ativo: (agora - new Date(dados.ultimaVenda).getTime()) <= limiteAtivo,
    }))
    .sort((a, b) => b.disponivel - a.disponivel)

  const filtro = searchParams.filtro || 'todos'
  if (filtro === 'ativos') vendedores = vendedores.filter(v => v.ativo)
  if (filtro === 'inativos') vendedores = vendedores.filter(v => !v.ativo)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl">Vendedores</h2>

        <div className="flex gap-1 bg-areia-100 rounded-xl p-1">
          {[
            { valor: 'todos', label: 'Todos' },
            { valor: 'ativos', label: 'Ativos' },
            { valor: 'inativos', label: 'Inativos' },
          ].map(opcao => (
            <Link
              key={opcao.valor}
              href={opcao.valor === 'todos' ? '/master/vendedores' : `/master/vendedores?filtro=${opcao.valor}`}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filtro === opcao.valor ? 'bg-white text-grafite shadow-sm' : 'text-gray-500 hover:text-grafite'
              )}
            >
              {opcao.label}
            </Link>
          ))}
        </div>
      </div>

      {!vendedores.length ? (
        <p className="text-gray-400 text-center py-12">
          {filtro === 'todos'
            ? 'Nenhum vendedor com transações ainda'
            : `Nenhum vendedor ${filtro === 'ativos' ? 'ativo' : 'inativo'} encontrado`}
        </p>
      ) : (
        <div className="space-y-3">
          {vendedores.map(v => (
            <VendedorCard key={v.id} vendedorId={v.id} {...v} />
          ))}
        </div>
      )}
    </div>
  )
}
