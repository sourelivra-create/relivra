'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftRight, BookOpen, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatarMoeda } from '@/lib/utils'
import { corEstado, labelEstado } from '@/lib/preco/calcular'
import { cn } from '@/lib/utils'
import type { Book } from '@/types/database.types'

export default function TrocarPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const livroDesejadoId = searchParams.get('livro') || ''
  const receptorId = searchParams.get('receptor') || ''

  const [livroDesejado, setLivroDesejado] = useState<Book | null>(null)
  const [meusLivros, setMeusLivros] = useState<Book[]>([])
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Buscar livro desejado
      const { data: livro } = await supabase
        .from('books')
        .select('*')
        .eq('id', livroDesejadoId)
        .single()

      setLivroDesejado(livro)

      // Buscar meus livros disponíveis para troca
      const { data: livros } = await supabase
        .from('books')
        .select('*')
        .eq('vendedor_id', user.id)
        .eq('vendido', false)
        .eq('aceita_troca', true)

      setMeusLivros(livros || [])
      setLoading(false)
    }
    carregar()
  }, [livroDesejadoId])

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const valorSolicitante = meusLivros
    .filter(l => selecionados.includes(l.id))
    .reduce((acc, l) => acc + Number(l.preco), 0)

  const valorReceptor = livroDesejado ? Number(livroDesejado.preco) : 0
  const diferenca = valorSolicitante - valorReceptor

  const handleProporTroca = async () => {
    if (!selecionados.length) {
      setErro('Selecione pelo menos um livro seu')
      return
    }

    setEnviando(true)
    setErro('')

    try {
      const res = await fetch('/api/trocas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receptor_id: receptorId,
          livros_solicitante: selecionados,
          livros_receptor: [livroDesejadoId],
          mensagem: mensagem.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Erro ao enviar proposta')
        return
      }

      setSucesso(true)
      setTimeout(() => router.push('/painel/trocas'), 2000)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-verde-500" />
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-verde-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-verde-600" />
        </div>
        <h2 className="font-display text-xl font-bold">Proposta enviada!</h2>
        <p className="text-gray-400 text-sm mt-2">O vendedor será notificado. Redirecionando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-grafite">Propor troca</h1>
        <p className="text-gray-500 text-sm mt-1">Selecione os livros que deseja oferecer</p>
      </div>

      {/* Livro desejado */}
      {livroDesejado && (
        <div className="mb-6">
          <p className="label mb-2">Livro que você quer</p>
          <div className="flex items-center gap-3 p-4 bg-areia-50 rounded-2xl border border-areia-200">
            <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-areia-200">
              {livroDesejado.imagem_url ? (
                <Image src={livroDesejado.imagem_url} alt={livroDesejado.titulo} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen size={16} className="text-areia-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800 truncate">{livroDesejado.titulo}</p>
              <p className="text-xs text-gray-500">{livroDesejado.autor}</p>
              <p className="text-verde-600 font-bold text-sm mt-1">{formatarMoeda(livroDesejado.preco)}</p>
            </div>
            <span className={cn('badge-estado', corEstado(livroDesejado.estado))}>
              {labelEstado(livroDesejado.estado)}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-center my-4">
        <div className="w-10 h-10 bg-verde-100 rounded-full flex items-center justify-center">
          <ArrowLeftRight size={18} className="text-verde-600" />
        </div>
      </div>

      {/* Meus livros */}
      <div className="mb-6">
        <p className="label mb-2">Seus livros para oferecer</p>
        {meusLivros.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-areia-50 rounded-2xl border border-areia-200">
            <BookOpen size={32} className="mx-auto mb-2 text-areia-300" />
            Você não tem livros disponíveis para troca.
            <br />
            <a href="/vender" className="text-verde-600 underline mt-2 inline-block">Publicar livro</a>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {meusLivros.map(livro => {
              const sel = selecionados.includes(livro.id)
              return (
                <div
                  key={livro.id}
                  onClick={() => toggleSelecionado(livro.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                    sel
                      ? 'bg-verde-50 border-verde-300'
                      : 'bg-white border-areia-200 hover:border-areia-300'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                    sel ? 'bg-verde-500 border-verde-500' : 'border-areia-300'
                  )}>
                    {sel && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-areia-100">
                    {livro.imagem_url ? (
                      <Image src={livro.imagem_url} alt={livro.titulo} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen size={12} className="text-areia-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{livro.titulo}</p>
                    <p className="text-xs text-gray-500 truncate">{livro.autor}</p>
                  </div>
                  <p className="text-verde-600 font-bold text-sm shrink-0">{formatarMoeda(livro.preco)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resumo de valores */}
      {selecionados.length > 0 && (
        <div className="bg-areia-50 border border-areia-200 rounded-2xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Você oferece</span>
            <span className="font-semibold">{formatarMoeda(valorSolicitante)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Você recebe</span>
            <span className="font-semibold">{formatarMoeda(valorReceptor)}</span>
          </div>
          <div className="border-t border-areia-200 pt-2 flex justify-between">
            <span className="font-medium text-gray-700">Diferença</span>
            <span className={cn('font-bold', diferenca >= 0 ? 'text-verde-600' : 'text-orange-500')}>
              {diferenca > 0 ? '+' : ''}{formatarMoeda(diferenca)}
            </span>
          </div>
        </div>
      )}

      {/* Mensagem */}
      <div className="mb-4">
        <label className="label">Mensagem (opcional)</label>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder="Diga algo ao vendedor..."
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
        />
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 
                        rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      <button
        onClick={handleProporTroca}
        disabled={enviando || !selecionados.length}
        className="btn-primary w-full py-3 text-base"
      >
        {enviando ? <Loader2 size={18} className="animate-spin" /> : <ArrowLeftRight size={18} />}
        {enviando ? 'Enviando proposta...' : 'Enviar proposta de troca'}
      </button>
    </div>
  )
}
