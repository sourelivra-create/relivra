'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Loader2, X, Send, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BotaoPedirDoacaoProps {
  bookId: string
  userId: string | null
  isProprioLivro: boolean
  jaSolicitado: boolean
  tamanho?: 'normal' | 'compacto'
}

export default function BotaoPedirDoacao({
  bookId, userId, isProprioLivro, jaSolicitado, tamanho = 'normal',
}: BotaoPedirDoacaoProps) {
  const router = useRouter()
  const supabase = createClient()

  const [modalAberto, setModalAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [solicitado, setSolicitado] = useState(jaSolicitado)

  const abrirModal = () => {
    if (!userId) {
      router.push(`/login?redirect=/livro/${bookId}`)
      return
    }
    setModalAberto(true)
  }

  const handleEnviar = async () => {
    if (!userId) return
    setEnviando(true)
    setErro('')

    try {
      // 1. Cria a solicitação formal (aparece no painel do doador,
      //    com Aceitar/Recusar, e trava o livro contra troca concorrente)
      const resSolicitar = await fetch('/api/doacoes/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId, mensagem: mensagem.trim() || null }),
      })
      const dataSolicitar = await resSolicitar.json()
      if (!resSolicitar.ok) {
        setErro(dataSolicitar.error || 'Erro ao solicitar')
        setEnviando(false)
        return
      }

      // 2. Abre (ou reaproveita) a conversa com o doador
      const resConversa = await fetch('/api/mensagens/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId }),
      })
      const dataConversa = await resConversa.json()
      if (!resConversa.ok) {
        // A solicitação já foi criada com sucesso — só a conversa que
        // falhou. Não trava o fluxo por isso, o doador já vê o pedido.
        setSolicitado(true)
        setModalAberto(false)
        router.refresh()
        return
      }

      // 3. Manda a mensagem de verdade na conversa, se a pessoa escreveu algo
      if (mensagem.trim()) {
        await supabase.from('mensagens').insert({
          conversa_id: dataConversa.id,
          remetente_id: userId,
          texto: mensagem.trim(),
        })
      }

      setSolicitado(true)
      setModalAberto(false)
      router.push(`/painel/mensagens/${dataConversa.id}`)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setEnviando(false)
    }
  }

  if (isProprioLivro) {
    return <p className="text-xs text-center text-gray-400 py-2">Este é o seu livro</p>
  }

  if (solicitado) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-xs text-verde-700 bg-verde-50 border border-verde-200 rounded-xl py-2">
        <CheckCircle2 size={13} />
        Você já solicitou
      </div>
    )
  }

  return (
    <>
      <button
        onClick={abrirModal}
        className={tamanho === 'compacto'
          ? 'btn-primary w-full text-xs py-2'
          : 'btn-primary w-full text-base py-3'
        }
      >
        <Gift size={tamanho === 'compacto' ? 14 : 18} />
        Pedir de graça
      </button>

      {modalAberto && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !enviando && setModalAberto(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 shadow-float"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-grafite">Pedir este livro</h3>
              <button onClick={() => !enviando && setModalAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-3">
              Escreva uma mensagem pro doador — isso abre uma conversa direta com ele,
              além de registrar seu pedido.
            </p>

            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="Oi! Tenho interesse nesse livro, ainda está disponível?"
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              maxLength={2000}
              autoFocus
            />

            {erro && <p className="text-xs text-red-500 mt-2">{erro}</p>}

            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="btn-primary w-full py-3 mt-4"
            >
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {enviando ? 'Enviando...' : 'Enviar pedido'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
