'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Loader2, CheckCircle2, Camera, AlertCircle, ChevronRight, X, ImagePlus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { EstadoLivro } from '@/types/database.types'

type Etapa = 'formulario' | 'publicando' | 'sucesso'

const ESTADOS: EstadoLivro[] = ['OTIMO', 'BOM', 'REGULAR', 'RUIM']
const LABEL_ESTADO: Record<EstadoLivro, string> = {
  OTIMO: 'Ótimo', BOM: 'Bom', REGULAR: 'Regular', RUIM: 'Ruim'
}

const LABELS_FOTO = ['Capa', 'Página interna', 'Verso / contracapa']
const MIN_FOTOS = 3
const MAX_FOTOS = 6

export default function VenderPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [etapa, setEtapa] = useState<Etapa>('formulario')
  const [fotos, setFotos] = useState<File[]>([])
  const [fotosPreviews, setFotosPreviews] = useState<string[]>([])
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<{ id: string; nome: string }[]>([])

  // Form state — tudo manual
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoriaNome, setCategoriaNome] = useState('')
  const [versao, setVersao] = useState('')
  const [estado, setEstado] = useState<EstadoLivro>('BOM')
  const [notaEstado, setNotaEstado] = useState('')
  const [preco, setPreco] = useState('')
  const [aceitaTroca, setAceitaTroca] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('categorias')
      .select('id, nome')
      .order('nome', { ascending: true })
      .then(({ data }) => setCategoriasDisponiveis(data || []))
  }, [])

  const handleAdicionarFotos = (files: FileList) => {
    const novasFotos = Array.from(files).slice(0, MAX_FOTOS - fotos.length)

    for (const file of novasFotos) {
      if (!file.type.startsWith('image/')) {
        setErro('Selecione apenas imagens (JPG, PNG, WebP)')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        setErro('Cada imagem deve ter no máximo 5MB')
        continue
      }
      setFotos(prev => [...prev, file])
      setFotosPreviews(prev => [...prev, URL.createObjectURL(file)])
    }
    setErro('')
  }

  const removerFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index))
    setFotosPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handlePublicar = async () => {
    if (!titulo.trim() || !autor.trim() || !preco) {
      setErro('Preencha título, autor e preço')
      return
    }
    if (!categoriaNome.trim()) {
      setErro('Informe uma categoria para o livro')
      return
    }
    if (fotos.length < MIN_FOTOS) {
      setErro(`São necessárias pelo menos ${MIN_FOTOS} fotos (capa, interna e verso)`)
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

      // Resolve a categoria (busca existente ou cria nova)
      const categoriaExistente = categoriasDisponiveis.find(
        c => c.nome.toLowerCase() === categoriaNome.trim().toLowerCase()
      )

      let categoriaId = categoriaExistente?.id

      if (!categoriaId) {
        const resCategoria = await fetch('/api/categorias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: categoriaNome.trim() }),
        })
        const dataCategoria = await resCategoria.json()
        if (!resCategoria.ok) throw new Error(dataCategoria.error || 'Erro ao criar categoria')
        categoriaId = dataCategoria.id
      }

      // Upload de todas as fotos
      const urlsFotos: string[] = []
      for (const foto of fotos) {
        const ext = foto.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('livros')
          .upload(path, foto, { cacheControl: '3600', upsert: false })

        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage.from('livros').getPublicUrl(path)
        urlsFotos.push(urlData.publicUrl)
      }

      // Inserir livro — tudo vem do formulário manual
      const { data: livro, error: insertErr } = await supabase
        .from('books')
        .insert({
          titulo: titulo.trim(),
          autor: autor.trim(),
          descricao: descricao.trim() || null,
          categoria_id: categoriaId,
          versao: versao.trim() || null,
          estado,
          nota_estado: notaEstado ? Number(notaEstado) : null,
          preco: Number(preco),
          aceita_troca: aceitaTroca,
          imagem_url: urlsFotos[0], // capa, mantido por compatibilidade
          fotos: urlsFotos,
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
      setEtapa('formulario')
    }
  }

  // ─── Tela: Publicando ────────────────────────────────────────
  if (etapa === 'publicando') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-verde-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 size={36} className="text-verde-600 animate-spin" />
        </div>
        <h2 className="font-display text-xl font-bold text-grafite">Publicando livro...</h2>
        <p className="text-gray-400 text-sm mt-2">Enviando fotos e salvando informações</p>
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

  // ─── Tela: Formulário (única etapa de preenchimento) ─────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-grafite">Vender um livro</h1>
        <p className="text-gray-500 text-sm mt-2">
          Preencha as informações e adicione as fotos do livro
        </p>
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 
                        rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      {/* ─── Fotos ─── */}
      <div className="mb-6">
        <label className="label">
          Fotos do livro * <span className="text-gray-400 font-normal">(mínimo {MIN_FOTOS}: capa, interna e verso)</span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {fotosPreviews.map((preview, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-areia-100 group">
              <Image src={preview} alt={`Foto ${i + 1}`} fill className="object-cover" />
              <button
                onClick={() => removerFoto(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
              >
                <X size={12} />
              </button>
              <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/50 rounded px-1 py-0.5 text-center truncate">
                {LABELS_FOTO[i] || `Extra ${i - 2}`}
              </span>
            </div>
          ))}

          {fotos.length < MAX_FOTOS && (
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-areia-300 
                         hover:border-verde-400 hover:bg-verde-50 transition-colors
                         flex flex-col items-center justify-center gap-1 text-gray-400"
            >
              {fotos.length === 0 ? <Camera size={20} /> : <ImagePlus size={20} />}
              <span className="text-[10px] font-medium">
                {LABELS_FOTO[fotos.length] || 'Adicionar'}
              </span>
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) handleAdicionarFotos(e.target.files)
            e.target.value = ''
          }}
        />

        <p className="text-xs text-gray-400 mt-2">
          {fotos.length}/{MIN_FOTOS} fotos mínimas adicionadas
        </p>
      </div>

      {/* ─── Campos manuais ─── */}
      <div className="space-y-4">
        <div>
          <label className="label">Título *</label>
          <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título do livro" />
        </div>

        <div>
          <label className="label">Autor *</label>
          <input className="input" value={autor} onChange={e => setAutor(e.target.value)} placeholder="Nome do autor" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoria *</label>
            <input
              className="input"
              list="categorias-sugeridas"
              value={categoriaNome}
              onChange={e => setCategoriaNome(e.target.value)}
              placeholder="Ex: Ficção"
            />
            <datalist id="categorias-sugeridas">
              {categoriasDisponiveis.map(c => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="label">Versão / Edição</label>
            <input
              className="input"
              value={versao}
              onChange={e => setVersao(e.target.value)}
              placeholder="Ex: 2ª edição, 2020"
            />
          </div>
        </div>

        <div>
          <label className="label">Descrição</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Detalhes adicionais sobre o livro..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Estado de conservação *</label>
            <select className="input" value={estado} onChange={e => setEstado(e.target.value as EstadoLivro)}>
              {ESTADOS.map(e => (
                <option key={e} value={e}>{LABEL_ESTADO[e]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Nota do estado (0-10)</label>
            <input
              type="number"
              className="input"
              value={notaEstado}
              onChange={e => setNotaEstado(e.target.value)}
              placeholder="Ex: 8"
              min={0}
              max={10}
              step={0.5}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-gray-500 bg-areia-50 rounded-xl p-3 border border-areia-200">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <p>
            Seja honesto na avaliação do estado — a plataforma analisa as fotos com IA
            e exibe essa avaliação independente aos compradores, ao lado da sua.
          </p>
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

      <button
        onClick={handlePublicar}
        className="btn-primary w-full mt-6 py-3"
      >
        <ChevronRight size={16} />
        Publicar livro
      </button>
    </div>
  )
}
