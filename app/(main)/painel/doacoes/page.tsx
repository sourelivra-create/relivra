import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Gift, BookOpen, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import AcaoSolicitacao from './AcaoSolicitacao'

const LABEL_STATUS: Record<string, { texto: string; cor: string; icone: any }> = {
  PENDENTE:  { texto: 'Aguardando resposta', cor: 'text-amber-700 bg-amber-50 border-amber-200', icone: Clock },
  ACEITA:    { texto: 'Aceita',              cor: 'text-verde-700 bg-verde-50 border-verde-200', icone: CheckCircle2 },
  RECUSADA:  { texto: 'Recusada',            cor: 'text-gray-500 bg-gray-50 border-gray-200',    icone: XCircle },
  CANCELADA: { texto: 'Cancelada',           cor: 'text-gray-500 bg-gray-50 border-gray-200',    icone: XCircle },
  CONCLUIDA: { texto: 'Concluída',           cor: 'text-verde-700 bg-verde-50 border-verde-200', icone: CheckCircle2 },
}

function CardSolicitacao({ solicitacao, mostrarSolicitante, acoes }: {
  solicitacao: any
  mostrarSolicitante: boolean
  acoes: React.ReactNode
}) {
  const status = LABEL_STATUS[solicitacao.status] || LABEL_STATUS.PENDENTE
  const StatusIcone = status.icone

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-areia-200 bg-white">
      <div className="relative w-11 h-15 rounded-lg overflow-hidden bg-areia-100 shrink-0">
        {solicitacao.book?.imagem_url ? (
          <Image src={solicitacao.book.imagem_url} alt={solicitacao.book.titulo} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen size={16} className="text-areia-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link href={`/livro/${solicitacao.book_id}`} className="font-semibold text-sm text-grafite hover:text-verde-600 truncate block">
          {solicitacao.book?.titulo}
        </Link>
        {mostrarSolicitante && (
          <p className="text-xs text-gray-500 truncate">
            Pedido de <span className="font-medium">{solicitacao.solicitante?.nome}</span>
          </p>
        )}
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border mt-1', status.cor)}>
          <StatusIcone size={10} />
          {status.texto}
        </span>
      </div>

      {acoes && <div className="shrink-0 flex flex-col gap-1.5">{acoes}</div>}
    </div>
  )
}

export default async function PainelDoacoesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Pedidos RECEBIDOS — solicitações em livros que EU sou dono
  const { data: meusLivros } = await supabase
    .from('books')
    .select('id')
    .eq('vendedor_id', user.id)

  const idsMeusLivros = (meusLivros || []).map(l => l.id)

  let recebidos: any[] = []
  if (idsMeusLivros.length > 0) {
    const { data } = await supabase
      .from('solicitacoes_doacao')
      .select('id, book_id, status, created_at, book:books(id, titulo, imagem_url), solicitante:profiles(id, nome)')
      .in('book_id', idsMeusLivros)
      .order('created_at', { ascending: false })
    recebidos = data || []
  }

  // Pedidos ENVIADOS — solicitações que EU fiz em livros de outra pessoa
  const { data: enviados } = await supabase
    .from('solicitacoes_doacao')
    .select('id, book_id, status, created_at, book:books(id, titulo, imagem_url)')
    .eq('solicitante_id', user.id)
    .order('created_at', { ascending: false })

  const recebidosPendentes = recebidos.filter(s => s.status === 'PENDENTE')
  const recebidosHistorico = recebidos.filter(s => s.status !== 'PENDENTE')
  const enviadosLista = enviados || []

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-lg font-bold text-grafite mb-1 flex items-center gap-2">
          <Gift size={18} className="text-verde-600" />
          Pedidos que você recebeu
        </h2>
        <p className="text-xs text-gray-400 mb-4">Pessoas pedindo seus livros de doação</p>

        {recebidos.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Nenhum pedido recebido ainda.</p>
        ) : (
          <div className="space-y-2">
            {recebidosPendentes.map(s => (
              <CardSolicitacao
                key={s.id}
                solicitacao={s}
                mostrarSolicitante
                acoes={
                  <>
                    <AcaoSolicitacao solicitacaoId={s.id} acao="ACEITAR" label="Aceitar" variante="primary" />
                    <AcaoSolicitacao solicitacaoId={s.id} acao="RECUSAR" label="Recusar" variante="danger" />
                  </>
                }
              />
            ))}
            {recebidosHistorico.map(s => (
              <CardSolicitacao key={s.id} solicitacao={s} mostrarSolicitante acoes={null} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-grafite mb-1">Seus pedidos enviados</h2>
        <p className="text-xs text-gray-400 mb-4">Livros de doação que você pediu para outras pessoas</p>

        {enviadosLista.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Você ainda não pediu nenhum livro de doação.</p>
        ) : (
          <div className="space-y-2">
            {enviadosLista.map(s => (
              <CardSolicitacao
                key={s.id}
                solicitacao={s}
                mostrarSolicitante={false}
                acoes={
                  s.status === 'PENDENTE'
                    ? <AcaoSolicitacao solicitacaoId={s.id} acao="CANCELAR" label="Cancelar pedido" variante="danger" />
                    : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
