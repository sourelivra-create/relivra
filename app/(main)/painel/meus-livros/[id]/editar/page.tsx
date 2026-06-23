'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import {
  Loader2, CheckCircle2, AlertCircle, ChevronRight, X, ImagePlus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { EstadoLivro } from '@/types/database.types'

type Etapa = 'carregando' | 'formulario' | 'salvando' | 'sucesso'

const ESTADOS: EstadoLivro[] = ['OTIMO', 'BOM', 'REGULAR', 'RUIM']
const LABEL_ESTADO: Record<EstadoLivro, string> = {
  OTIMO: 'Ótimo', BOM: 'Bom', REGULAR: 'Regular', RUIM: 'Ruim'
}

const LABELS_FOTO = ['Capa', 'Página interna', 'Verso / contracapa']
const MIN_FOTOS = 3
const MAX_FOTOS = 6

export default function EditarLivroPage() {
  const router = useRouter()
  const params = useParams()
  const livroId = params.id as string
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [etapa, setEtapa] = useState<Etapa>('carregando')

  const [fotosExistentes, setFotosExistentes] = useState<string[]>([])
  const [fotosNovas, setFotosNovas] = useState<File[]>([])
  const [fotosNovasPreviews, setFotosNovasPreviews] = useState<string[]>([])
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<{ id: string; nome: string }[]>([])

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
    async function carregarLivro() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/login?redirect=/painel/meus-livros/${livroId}/editar`)
        return
      }

      const { data: livro, error } = await supabase
        .from('books')
        .select('*, categoria:categorias(id, nome)')
        .eq('id', livroId)
        .single()

      if (error || !livro) {
        setErro('Livro não encontrado')
        return
      }

      if (livro.vendedor_id !== user.id) {
        router.push('/painel/meus-livros')
        return
      }

      setTitulo(livro.titulo)
      setAutor(livro.autor)
      setDescricao(livro.descricao || '')
      setCategoriaNome((livro.categoria as any)?.nome || '')
      setVersao(livro.versao || '')
      setEstado(livro.estado)
      setNotaEstado(livro.nota_estado != null ? String(livro.nota_estado) : '')
      setPreco(String(livro.preco))
      setAceitaTroca(livro.aceita_troca)
      setFotosExistentes(livro.fotos?.length ? livro.fotos : (livro.imagem_url ? [livro.imagem_url] : []))

      setEtapa('formulario')
    }

    carregarLivro()
  }, [livroId])

  useEffect(() => {
    supabase
      .from('categorias')
      .select('id, nome')
      .order('nome', { ascending: true })
      .then(({ data }) => setCategoriasDisponiveis(data || []))
  }, [])

  const totalFotos = fotosExistentes.length + fotosNovas.length

  const handleAdicionarFotos = (files: FileList) => {
    const novasFotos = Array.from(files).slice(0, MAX_FOTOS - totalFotos)

    for (const file of novasFotos) {
      if (!file.type.startsWith('image/')) {
        setErro('Selecione apenas imagens (JPG, PNG, WebP)')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        setErro('Cada imagem deve ter no máximo 5MB')
        continue
      }
      setFotosNovas(prev => [...prev, file])
      setFotosNovasPreviews(prev => [...prev, URL.createObjectURL(file)])
    }
    setErro('')
  }

  const removerFotoExistente = (index: number) => {
    setFotosExistentes(prev => prev.filter((_, i) => i !== index))
  }

  const removerFotoNova = (index: number) => {
    setFotosNovas(prev => prev.filter((_, i) => i !== index))
    setFotosNovasPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSalvar = async () => {
    if (!titulo.trim() || !autor.trim() || !preco) {
      setErro('Preencha título, autor e preço')
      return
    }
    if (!categoriaNome.trim()) {
      setErro('Informe uma categoria para o livro')
      return
    }
    if (totalFotos < MIN_FOTOS) {
      setErro(`São necessárias pelo menos ${MIN_FOTOS} fotos (capa, interna e verso)`)
      return
    }

    setEtapa('salvando')
    setErro('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

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

      const urlsNovasFotos: string[] = []
      for (const foto of fotosNovas) {
        const ext = foto.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('livros')
          .upload(path, foto, { cacheControl: '3600', upsert: false })

        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage.from('livros').getPublicUrl(path)
        urlsNovasFotos.push(urlData.publicUrl)
      }

      const todasFotos = [...fotosExistentes, ...urlsNovasFotos]

      const { error: updateErr } = await supabase
        .from('books')
        .update({
          titulo: titulo.trim(),
          autor: autor.trim(),
          descricao: descricao.trim() || null,
          categoria_id: categoriaId,
          versao: versao.trim() || null,
          estado,
          nota_estado: notaEstado ? Number(notaEstado) : null,
          preco: Number(preco),
          aceita_troca: aceitaTroca,
          imagem_url: todasFotos[0],
          fotos: todasFotos,
        })
        .eq('id', livroId)

      if (updateErr) throw updateErr

      setEtapa('sucesso')
      setTimeout(() => router.push(`/livro/${livroId}`), 1500)
    } catch (err) {
      console.error(err)
      setErro('Erro ao salvar. Tente novamente.')
      setEtapa('formulario')
    }
  }

  if (etapa === 'carregando') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-verde-500" />
      </div>
    )
  }

  if (etapa === 'salvando') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-verde-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 size={36} className="text-verde-600 animate-spin" />
        </div>
        <h2 className="font-display text-xl font-bold text-grafite">Salvando alterações...</h2>
      </div>
    )
  }

  if (etapa === 'sucesso') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-verde-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-verde-600" />
        </div>
        <h2 className="font-display text-xl font-bold text-grafite">Anúncio atualizado!</h2>
        <p className="text-gray-400 text-sm mt-2">Redirecionando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-grafite">Editar anúncio</h1>
        <p className="text-gray-500 text-sm mt-2">Atualize as informações e republique</p>
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200
                        rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      <div className="mb-6">
        <label className="label">
          Fotos do livro * <span className="text-gray-400 font-normal">(mínimo {MIN_FOTOS})</span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {fotosExistentes.map((url, i) => (
            <div key={`existente-${i}`} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-areia-100">
              <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" />
              <button
                onClick={() => removerFotoExistente(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
              >
                <X size={12} />
              </button>
              <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/50 rounded px-1 py-0.5 text-center truncate">
                {LABELS_FOTO[i] || `Extra ${i - 2}`}
              </span>
            </div>
          ))}

          {fotosNovasPreviews.map((preview, i) => (
            <div key={`nova-${i}`} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-areia-100">
              <Image src={preview} alt={`Nova foto ${i + 1}`} fill className="object-cover" />
              <button
                onClick={() => removerFotoNova(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
              >
                <X size={12} />
              </button>
              <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-verde-deep/80 rounded px-1 py-0.5 text-center truncate">
                Nova
              </span>
            </div>
          ))}

          {totalFotos < MAX_FOTOS && (
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-areia-300
                         hover:border-verde-400 hover:bg-verde-50 transition-colors
                         flex flex-col items-center justify-center gap-1 text-gray-400"
            >
              <ImagePlus size={20} />
              <span className="text-[10px] font-medium">Adicionar</span>
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
          {totalFotos}/{MIN_FOTOS} fotos mínimas
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Título *</label>
          <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} />
        </div>

        <div>
          <label className="label">Autor *</label>
          <input className="input" value={autor} onChange={e => setAutor(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoria *</label>
            <input
              className="input"
              list="categorias-sugeridas"
              value={categoriaNome}
              onChange={e => setCategoriaNome(e.target.value)}
            />
            <datalist id="categorias-sugeridas">
              {categoriasDisponiveis.map(c => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="label">Versão / Edição</label>
            <input className="input" value={versao} onChange={e => setVersao(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Descrição</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
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
            <label className="label">Nota (0-10)</label>
            <input
              type="number"
              className="input"
              value={notaEstado}
              onChange={e => setNotaEstado(e.target.value)}
              min={0}
              max={10}
              step={0.5}
            />
          </div>
        </div>

        <div>
          <label className="label">Preço de venda (R$) *</label>
          <input
            type="number"
            className="input"
            value={preco}
            onChange={e => setPreco(e.target.value)}
            min={1}
            step={0.01}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={aceitaTroca}
            onChange={e => setAceitaTroca(e.target.checked)}
            className="rounded"
          />
          Aceito trocas por este livro
        </label>
      </div>

      <button onClick={handleSalvar} className="btn-primary w-full mt-8 py-3">
        <ChevronRight size={18} />
        Salvar e republicar
      </button>
    </div>
  )
}
