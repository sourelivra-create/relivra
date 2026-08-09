'use client'

import Link from 'next/link'
import { ArrowLeftRight } from 'lucide-react'
import BotaoPedirDoacao from '@/components/doacoes/BotaoPedirDoacao'

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
  if (isProprioLivro) {
    return <p className="text-xs text-center text-gray-400 py-2">Este é o seu livro</p>
  }

  return (
    <div className="space-y-1.5">
      <BotaoPedirDoacao
        bookId={bookId}
        userId={userId}
        isProprioLivro={isProprioLivro}
        jaSolicitado={jaSolicitado}
        tamanho="compacto"
      />

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
    </div>
  )
}
