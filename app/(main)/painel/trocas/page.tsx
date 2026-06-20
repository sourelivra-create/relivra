import { createClient } from '@/lib/supabase/server'
import { formatarMoeda, formatarData, cn } from '@/lib/utils'
import { ArrowLeftRight, BookOpen } from 'lucide-react'
import ResponderTroca from './ResponderTroca'
import Image from 'next/image'

const STATUS_LABEL: Record<string, { label: string; classe: string }> = {
  PENDENTE:   { label: 'Pendente',  classe: 'bg-amber-100 text-amber-700 border-amber-200' },
  ACEITA:     { label: 'Aceita',    classe: 'bg-verde-100 text-verde-700 border-verde-200' },
  RECUSADA:   { label: 'Recusada', classe: 'bg-red-100 text-red-700 border-red-200' },
  FINALIZADA: { label: 'Finalizada', classe: 'bg-gray-100 text-gray-600 border-gray-200' },
  CANCELADA:  { label: 'Cancelada', classe: 'bg-gray-100 text-gray-400 border-gray-200' },
}

export default async function TrocasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: trocas } = await supabase
    .from('trocas')
    .select(`
      *,
      solicitante:profiles!solicitante_id(nome),
      receptor:profiles!receptor_id(nome),
      troca_itens(
        *,
        book:books(id, titulo, autor, imagem_url, preco)
      )
    `)
    .or(`solicitante_id.eq.${user!.id},receptor_id.eq.${user!.id}`)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h2 className="font-display font-bold text-xl mb-4">Minhas trocas</h2>

      {!trocas?.length ? (
        <div className="text-center py-20 text-gray-400">
          <ArrowLeftRight size={48} className="mx-auto mb-3 text-areia-300" />
          <p className="font-medium">Nenhuma troca ainda</p>
          <p className="text-sm mt-1">Explore livros disponíveis para troca</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trocas.map((troca: any) => {
            const ehSolicitante = troca.solicitante_id === user!.id
            const ehReceptor    = troca.receptor_id === user!.id
            const meuStatus = STATUS_LABEL[troca.status] || STATUS_LABEL.PENDENTE

            const livrosSolicitante = (troca.troca_itens || []).filter(
              (i: any) => i.dono_id === troca.solicitante_id
            )
            const livrosReceptor = (troca.troca_itens || []).filter(
              (i: any) => i.dono_id === troca.receptor_id
            )

            return (
              <div key={troca.id} className="card p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-500">
                    {ehSolicitante
                      ? `Você propôs para ${(troca.receptor as any)?.nome}`
                      : `${(troca.solicitante as any)?.nome} propôs para você`
                    }
                    <span className="text-xs ml-1 text-gray-400">· {formatarData(troca.created_at)}</span>
                  </div>
                  <span className={cn('badge-estado border', meuStatus.classe)}>
                    {meuStatus.label}
                  </span>
                </div>

                {/* Itens */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Lado solicitante */}
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">
                      {ehSolicitante ? 'Seus livros' : `Livros de ${(troca.solicitante as any)?.nome}`}
                    </p>
                    <div className="space-y-2">
                      {livrosSolicitante.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <div className="relative w-8 h-11 rounded-md overflow-hidden bg-areia-100 shrink-0">
                            {item.book?.imagem_url ? (
                              <Image src={item.book.imagem_url} alt={item.book.titulo} fill className="object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <BookOpen size={10} className="text-areia-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{item.book?.titulo}</p>
                            <p className="text-xs text-verde-600">{formatarMoeda(item.book?.preco || 0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs font-bold text-gray-700 mt-2">
                      Total: {formatarMoeda(troca.valor_total_solicitante)}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-areia-200" />
                    <div className="pl-3">
                      <p className="text-xs text-gray-400 font-medium mb-2">
                        {ehReceptor ? 'Seus livros' : `Livros de ${(troca.receptor as any)?.nome}`}
                      </p>
                      <div className="space-y-2">
                        {livrosReceptor.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <div className="relative w-8 h-11 rounded-md overflow-hidden bg-areia-100 shrink-0">
                              {item.book?.imagem_url ? (
                                <Image src={item.book.imagem_url} alt={item.book.titulo} fill className="object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <BookOpen size={10} className="text-areia-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{item.book?.titulo}</p>
                              <p className="text-xs text-verde-600">{formatarMoeda(item.book?.preco || 0)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs font-bold text-gray-700 mt-2">
                        Total: {formatarMoeda(troca.valor_total_receptor)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Diferença de valor */}
                {troca.diferenca_valor > 0 && (
                  <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-areia-100">
                    Diferença: <strong>{formatarMoeda(troca.diferenca_valor)}</strong>
                  </p>
                )}

                {/* Mensagem */}
                {troca.mensagem && (
                  <p className="text-xs text-gray-500 italic mt-2 bg-areia-50 rounded-lg p-2">
                    "{troca.mensagem}"
                  </p>
                )}

                {/* Responder (só receptor pode aceitar/recusar se pendente) */}
                {ehReceptor && troca.status === 'PENDENTE' && (
                  <div className="mt-3 pt-3 border-t border-areia-100">
                    <ResponderTroca trocaId={troca.id} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
