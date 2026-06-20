'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Upload, Sparkles, Loader2, CheckCircle2, Camera,
  AlertCircle, ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { EstadoLivro, CategoriaLivro, AnaliseIA } from '@/types/database.types'

type Etapa = 'upload' | 'analisando' | 'revisao' | 'publicando' | 'sucesso'

const CATEGORIAS: { value: CategoriaLivro; label: string }[] = [
  { value: 'LITERATURA', label: 'Literatura' },
  { value: 'FICCAO', label: 'Ficção' },
  { value: 'BIOGRAFIA', label: 'Biografia' },
  { value: 'NEGOCIOS', label: 'Negócios' },
  { value: 'TECNOLOGIA', label: 'Tecnologia' },
  { value: 'CIENCIA', label: 'Ciência' },
  { value: 'FILOSOFIA', label: 'Filosofia' },
  { value: 'HISTORIA', label: 'História' },
  { value: 'INFANTIL', label: 'Infantil' },
  { value: 'DIDATICO', label: 'Didático' },
  { value: 'OUTROS', label: 'Outros' },
]

const ESTADOS: EstadoLivro[] = ['OTIMO', 'BOM', 'REGULAR', 'RUIM']
const LABEL_ESTADO: Record<EstadoLivro, string> = {
  OTIMO: 'Ótimo', BOM: 'Bom', REGULAR: 'Regular', RUIM: 'Ruim'
}

export default function VenderPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [etapa, setEtapa] = useState<Etapa>('upload')
  const [imagemFile, setImagemFile] = useState<File | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [analise, setAnalise] = useState<AnaliseIA & {
    preco_sugerido?: number
    preco_mercado?: number
  } | null>(null)

  // Form state
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<CategoriaLivro>('OUTROS')
  const [estado, setEstado] = useState<EstadoLivro>('BOM')
  const [preco, setPreco] = useState('')
  const [aceitaTroca, setAceitaTroca] = useState(true)
  const [erro, setErro] = useState('')

  const handleImagem = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErro('Selecione uma imagem válida (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro('Imagem muito grande. Máximo 5MB.')
      return
    }

    setImagemFile(file)
    setImagemPreview(URL.createObjectURL(file))
    setErro('')
    analisarImagem(file)
  }

  const analisarImagem = async (file: File) => {
    setEtapa('analisando')

    const formData = new FormData()
    formData.append('imagem', file)

    try {
      const res = await fetch('/api/ia/analisar', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || 'Erro na análise')
        setEtapa('upload')
        return
      }

      setAnalise(data)
      setTitulo(data.titulo || '')
      setAutor(data.autor || '')
      setDescricao(data.descricao_estado || '')
      setEstado(data.estado || 'BOM')
      setPreco(String(data.preco_sugerido || ''))
      setEtapa('revisao')
    } catch {
      setErro('Falha na análise. Tente novamente.')
      setEtapa('upload')
    }
  }

  const handlePublicar = async () => {
    if (!titulo.trim() || !autor.trim() || !preco) {
      setErro('Preencha título, autor e preço')
      return
    }
    if (!imagemFile) {
      setErro('Imagem obrigatória')
      return
    }

    setEtapa('publicando')
    setErro('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/vender')
        return
      }

      // Upload da imagem
      const ext = imagemFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('livros')
        .upload(path, imagemFile, { cacheControl: '3600', upsert: false })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('livros').getPublicUrl(path)

      // Inserir livro
      const { data: livro, error: insertErr } = await supabase
        .from('books')
        .insert({
          titulo: titulo.trim(),
          autor: autor.trim(),
          descricao: descricao.trim() || null,
          categoria,
          estado,
          nota_estado: analise?.nota || null,
          preco: Number(preco),
          preco_sugerido: analise?.preco_sugerido || null,
          aceita_troca: aceitaTroca,
          imagem_url: urlData.publicUrl,
          vendedor_id: user.id,
          vendido: false,
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      setEtapa('sucesso')
      setTimeout(() => router.push(`/livro/${livro.id}`), 2000)
    } catch (err) {
      console.error(err)
      setErro('Erro ao publicar. Tente novamente.')
      setEtapa('revisao')
    }
  }

  // ─── Tela: Upload ───────────────────────────────────────────
  if (etapa === 'upload') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-grafite">Vender um livro</h1>
          <p className="text-gray-500 text-sm mt-2">
            Tire uma foto do livro e a IA cuida do resto
          </p>
        </div>

        {erro && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 
                          rounded-xl p-3 mb-4 text-sm">
            <AlertCircle size={16} />
            {erro}
          </div>
        )}

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) handleImagem(file)
          }}
          className="border-2 border-dashed border-areia-300 hover:border-verde-400 
                     rounded-3xl p-12 text-center cursor-pointer transition-colors
                     hover:bg-verde-50 group"
        >
          <div className="w-16 h-16 bg-verde-100 rounded-2xl flex items-center justify-center 
                          mx-auto mb-4 group-hover:bg-verde-200 transition-colors">
            <Camera size={28} className="text-verde-600" />
          </div>
          <p className="font-semibold text-gray-700">Clique para enviar ou arraste aqui</p>
          <p className="text-sm text-gray-400 mt-1">JPG, PNG ou WebP • Máx. 5MB</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleImagem(file)
          }}
        />

        <div className="mt-6 flex items-start gap-3 text-sm text-gray-500 bg-areia-50 
                        rounded-xl p-4 border border-areia-200">
          <Sparkles size={16} className="text-verde-500 mt-0.5 shrink-0" />
          <p>
            Nossa IA analisa a imagem e preenche título, autor, estado e preço automaticamente.
            Você só precisa confirmar!
          </p>
        </div>
      </div>
    )
  }

  // ─── Tela: Analisando ────────────────────────────────────────
  if (etapa === 'analisando') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-verde-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles size={36} className="text-verde-600 animate-pulse" />
        </div>
        <h2 className="font-display text-xl font-bold text-grafite">Analisando o livro...</h2>
        <p className="text-gray-400 text-sm mt-2">A IA está avaliando título, estado e preço</p>
        {imagemPreview && (
          <div className="relative w-32 h-44 mx-auto mt-8 rounded-xl overflow-hidden shadow-card">
            <Image src={imagemPreview} alt="Livro" fill className="object-cover" />
          </div>
        )}
      </div>
    )
  }

  // ─── Tela: Sucesso ───────────────────────────────────────────
  if (etapa === 'sucesso') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-verde-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-verde-600" />
        </div>
        <h2 className="font-display text-xl font-bold text-grafite">Livro publicado!</h2>
        <p className="text-gray-400 text-sm mt-2">Redirecionando para a página do livro...</p>
      </div>
    )
  }

  // ─── Tela: Revisão + Publicar ────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        {imagemPreview && (
          <div className="relative w-16 h-22 rounded-xl overflow-hidden shadow-card shrink-0">
            <Image src={imagemPreview} alt="Livro" fill className="object-cover" />
          </div>
        )}
        <div>
          <h1 className="font-display text-xl font-bold text-grafite">Confirmar detalhes</h1>
          <p className="text-gray-400 text-sm">Revise e ajuste as informações</p>
        </div>
      </div>

      {analise?.incerto && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 
                        rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={16} />
          A IA não teve certeza em alguns campos. Verifique abaixo.
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 
                        rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="label">Título *</label>
          <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título do livro" />
        </div>

        <div>
          <label className="label">Autor *</label>
          <input className="input" value={autor} onChange={e => setAutor(e.target.value)} placeholder="Nome do autor" />
        </div>

        <div>
          <label className="label">Descrição do estado</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Descreva o estado de conservação..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoria</label>
            <select className="input" value={categoria} onChange={e => setCategoria(e.target.value as CategoriaLivro)}>
              {CATEGORIAS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Estado *</label>
            <select className="input" value={estado} onChange={e => setEstado(e.target.value as EstadoLivro)}>
              {ESTADOS.map(e => (
                <option key={e} value={e}>{LABEL_ESTADO[e]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Preço (R$) *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
              R$
            </span>
            <input
              type="number"
              className="input pl-9"
              value={preco}
              onChange={e => setPreco(e.target.value)}
              placeholder="0,00"
              min={1}
              step={0.01}
            />
          </div>
          {analise?.preco_sugerido && (
            <p className="text-xs text-gray-400 mt-1">
              💡 Sugerido pela IA: R$ {analise.preco_sugerido.toFixed(2)}
              {analise.preco_mercado && ` (mercado: R$ ${analise.preco_mercado.toFixed(2)})`}
            </p>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-4 bg-verde-50 rounded-xl border border-verde-100">
          <div
            className={cn(
              'relative w-10 h-6 rounded-full transition-colors shrink-0',
              aceitaTroca ? 'bg-verde-500' : 'bg-areia-300'
            )}
            onClick={() => setAceitaTroca(!aceitaTroca)}
          >
            <div className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
              aceitaTroca ? 'translate-x-5' : 'translate-x-1'
            )} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Aceitar trocas</p>
            <p className="text-xs text-gray-500">Outros usuários poderão propor troca pelo seu livro</p>
          </div>
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => { setEtapa('upload'); setAnalise(null) }}
          className="btn-secondary"
        >
          Trocar foto
        </button>
        <button
          onClick={handlePublicar}
          disabled={etapa === 'publicando'}
          className="btn-primary flex-1"
        >
          {etapa === 'publicando' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ChevronRight size={16} />
          )}
          {etapa === 'publicando' ? 'Publicando...' : 'Publicar livro'}
        </button>
      </div>
    </div>
  )
}
