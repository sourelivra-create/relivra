'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Send, Loader2, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Mensagem } from '@/types/database.types'

interface ConversaCompleta {
  id: string
  book_id: string
  comprador_id: string
  vendedor_id: string
  book: { id: string; titulo: string; imagem_url: string | null } | null
  outraPessoa: { id: string; nome: string } | null
}

export default function ConversaPage() {
  const params = useParams()
  const router = useRouter()
  const conversaId = params.id as string
  const supabase = createClient()
  const fimDaListaRef = useRef<HTMLDivElement>(null)

  const [carregando, setCarregando] = useState(true)
  const [conversa, setConversa] = useState<ConversaCompleta | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/login?redirect=/painel/mensagens/${conversaId}`)
        return
      }
      setUserId(user.id)

      const { data: c, error } = await supabase
        .from('conversas')
        .select(`
          id, book_id, comprador_id, vendedor_id,
          book:books(id, titulo, imagem_url),
          comprador:profiles!conversas_comprador_id_fkey(id, nome),
          vendedor:profiles!conversas_vendedor_id_fkey(id, nome)
        `)
        .eq('id', conversaId)
        .single()

      if (error || !c) {
        setErro('Conversa não encontrada')
        setCarregando(false)
        return
      }

      const dados = c as any
      const outraPessoa = dados.comprador_id === user.id ? dados.vendedor : dados.comprador

      setConversa({
        id: dados.id,
        book_id: dados.book_id,
        comprador_id: dados.comprador_id,
        vendedor_id: dados.vendedor_id,
        book: dados.book,
        outraPessoa,
      })

      const { data: msgs } = await supabase
        .from('mensagens')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('created_at', { ascending: true })

      setMensagens(msgs || [])

      // Marca como lida toda mensagem que não é minha e ainda não
      // tinha sido lida — dispara em segundo plano, não bloqueia a tela
      const idsNaoLidas = (msgs || [])
        .filter(m => m.remetente_id !== user.id && !m.lida_em)
        .map(m => m.id)

      if (idsNaoLidas.length > 0) {
        supabase
          .from('mensagens')
          .update({ lida_em: new Date().toISOString() })
          .in('id', idsNaoLidas)
          .then(() => {})
      }

      setCarregando(false)
    }

    carregar()
  }, [conversaId])

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  const handleEnviar = async () => {
    if (!texto.trim() || !userId) return

    setEnviando(true)
    setErro('')

    const { data: nova, error } = await supabase
      .from('mensagens')
      .insert({
        conversa_id: conversaId,
        remetente_id: userId,
        texto: texto.trim(),
      })
      .select()
      .single()

    if (error) {
      setErro('Erro ao enviar mensagem. Tente novamente.')
      setEnviando(false)
      return
    }

    setMensagens(prev => [...prev, nova])
    setTexto('')
    setEnviando(false)
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-verde-500" />
      </div>
    )
  }

  if (erro && !conversa) {
    return (
      <div className="text-center py-16 text-gray-400">{erro}</div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[400px]">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 pb-4 border-b border-areia-200 mb-4">
        <Link href="/painel/mensagens" className="text-gray-400 hover:text-grafite">
          <ArrowLeft size={20} />
        </Link>

        <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-areia-100 shrink-0">
          {conversa?.book?.imagem_url ? (
            <Image src={conversa.book.imagem_url} alt={conversa.book.titulo} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen size={14} className="text-areia-400" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-sm text-grafite truncate">{conversa?.outraPessoa?.nome || 'Usuário'}</p>
          <Link href={`/livro/${conversa?.book_id}`} className="text-xs text-gray-400 hover:text-verde-600 truncate block">
            {conversa?.book?.titulo}
          </Link>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {mensagens.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            Nenhuma mensagem ainda. Diga oi 👋
          </p>
        ) : (
          mensagens.map(m => {
            const minha = m.remetente_id === userId
            return (
              <div key={m.id} className={cn('flex', minha ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                    minha
                      ? 'bg-verde-500 text-white rounded-br-sm'
                      : 'bg-areia-100 text-grafite rounded-bl-sm'
                  )}
                >
                  {m.texto}
                </div>
              </div>
            )
          })
        )}
        <div ref={fimDaListaRef} />
      </div>

      {erro && <p className="text-xs text-red-500 mt-2">{erro}</p>}

      {/* Enviar */}
      <div className="flex items-center gap-2 pt-4 mt-2 border-t border-areia-200">
        <input
          className="input flex-1"
          placeholder="Escreva uma mensagem..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleEnviar()}
          maxLength={2000}
        />
        <button
          onClick={handleEnviar}
          disabled={enviando || !texto.trim()}
          className="btn-primary px-4 py-2.5"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
