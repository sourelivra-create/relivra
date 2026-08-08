import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function MensagensPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: conversas } = await supabase
    .from('conversas')
    .select(`
      id, ultima_mensagem_em, comprador_id, vendedor_id,
      book:books(id, titulo, imagem_url),
      comprador:profiles!conversas_comprador_id_fkey(id, nome),
      vendedor:profiles!conversas_vendedor_id_fkey(id, nome)
    `)
    .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`)
    .order('ultima_mensagem_em', { ascending: false })

  const lista = conversas || []

  // Última mensagem de cada conversa + se tem não lida — busca à
  // parte porque o Supabase não deixa fazer "pega a última linha de
  // cada grupo" direto num select() com join
  const idsConversas = lista.map((c: any) => c.id)
  const previews = new Map<string, { texto: string; naoLida: boolean }>()

  if (idsConversas.length > 0) {
    const { data: mensagens } = await supabase
      .from('mensagens')
      .select('conversa_id, texto, remetente_id, lida_em, created_at')
      .in('conversa_id', idsConversas)
      .order('created_at', { ascending: false })

    for (const msg of mensagens || []) {
      if (!previews.has(msg.conversa_id)) {
        previews.set(msg.conversa_id, {
          texto: msg.texto,
          naoLida: msg.remetente_id !== user.id && !msg.lida_em,
        })
      }
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-grafite mb-6">Mensagens</h1>

      {lista.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageCircle size={40} className="mx-auto text-areia-400 mb-3" />
          Nenhuma conversa ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((c: any) => {
            const outraPessoa = c.comprador_id === user.id ? c.vendedor : c.comprador
            const preview = previews.get(c.id)

            return (
              <Link
                key={c.id}
                href={`/painel/mensagens/${c.id}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-2xl border transition-colors',
                  preview?.naoLida
                    ? 'bg-verde-50 border-verde-200'
                    : 'bg-white border-areia-200 hover:border-areia-300'
                )}
              >
                <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-areia-100 shrink-0">
                  {c.book?.imagem_url ? (
                    <Image src={c.book.imagem_url} alt={c.book.titulo} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen size={18} className="text-areia-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('text-sm truncate', preview?.naoLida ? 'font-bold text-grafite' : 'font-medium text-gray-700')}>
                      {outraPessoa?.nome || 'Usuário'}
                    </p>
                    {preview?.naoLida && <span className="w-2 h-2 rounded-full bg-verde-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{c.book?.titulo}</p>
                  {preview && (
                    <p className={cn('text-xs truncate mt-0.5', preview.naoLida ? 'text-grafite font-medium' : 'text-gray-400')}>
                      {preview.texto}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
