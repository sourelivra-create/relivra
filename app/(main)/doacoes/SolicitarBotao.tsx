'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Gift, ArrowLeftRight, Loader2, CheckCircle2 } from 'lucide-react'

interface SolicitarBotaoProps {
  bookId: string
  userId: string | null
  isProprioLivro: boolean
  jaSolicitado: boolean
  aceitaTroca: boolean
  vendedorId: string
}

export default function SolicitarBotao({
  bookId, userId, isProprioLivro, jaSolicitado, aceitaTroca, vendedorId,
}: SolicitarBotaoProps) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [solicitado, setSolicitado] = useState(jaSolicitado)
  const [erro, setErro] = useState('')

  const handleSolicitar = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (!userId) {
      router.push(`/login?redirect=/doacoes`)
      return
    }

    setEnviando(true)
    setErro('')
    try {
      const res = await fetch('/api/doacoes/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Erro ao solicitar')
        return
      }
      setSolicitado(true)
      router.refresh()
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (isProprioLivro) {
    return (
      <p className="text-xs text-center text-gray-400 py-2">Este é o seu livro</p>
    )
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
    <div className="space-y-1.5">
      <button
        onClick={handleSolicitar}
        disabled={enviando}
        className="btn-primary w-full text-xs py-2"
      >
        {enviando ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
        {enviando ? 'Enviando...' : 'Pedir de graça'}
      </button>

      {aceitaTroca && (
        <Link
          href={userId
            ? `/trocar?livro=${bookId}&receptor=${vendedorId}`
            : `/login?redirect=/trocar?livro=${bookId}`
          }
          className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
        >
          <ArrowLeftRight size={14} />
          Oferecer troca
        </Link>
      )}

      {erro && <p className="text-xs text-red-500 text-center">{erro}</p>}
    </div>
  )
}
