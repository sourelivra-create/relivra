'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoriaLivro, EstadoLivro } from '@/types/database.types'

const ESTADOS: { value: EstadoLivro; label: string; cor: string }[] = [
  { value: 'OTIMO',   label: 'Ótimo',   cor: 'bg-verde-100 text-verde-700 border-verde-300' },
  { value: 'BOM',     label: 'Bom',     cor: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'REGULAR', label: 'Regular', cor: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'RUIM',    label: 'Ruim',    cor: 'bg-red-100 text-red-700 border-red-300' },
]

const CATEGORIAS: { value: CategoriaLivro; label: string }[] = [
  { value: 'LITERATURA',  label: 'Literatura' },
  { value: 'FICCAO',      label: 'Ficção' },
  { value: 'BIOGRAFIA',   label: 'Biografia' },
  { value: 'NEGOCIOS',    label: 'Negócios' },
  { value: 'TECNOLOGIA',  label: 'Tecnologia' },
  { value: 'CIENCIA',     label: 'Ciência' },
  { value: 'FILOSOFIA',   label: 'Filosofia' },
  { value: 'HISTORIA',    label: 'História' },
  { value: 'INFANTIL',    label: 'Infantil' },
  { value: 'DIDATICO',    label: 'Didático' },
  { value: 'OUTROS',      label: 'Outros' },
]

export default function FiltrosLivros() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filtroPainel, setFiltroPainel] = useState(false)

  const estadoAtivo    = searchParams.get('estado') as EstadoLivro | null
  const categoriaAtiva = searchParams.get('categoria') as CategoriaLivro | null
  const precoMin       = searchParams.get('preco_min') || ''
  const precoMax       = searchParams.get('preco_max') || ''
  const buscaAtiva     = searchParams.get('busca') || ''
  const somenteTroca   = searchParams.get('troca') === '1'

  const atualizar = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  const limparFiltros = () => {
    router.push('/', { scroll: false })
  }

  const temFiltros = estadoAtivo || categoriaAtiva || precoMin || precoMax || somenteTroca

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título ou autor..."
            defaultValue={buscaAtiva}
            className="input pl-10"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                atualizar('busca', (e.target as HTMLInputElement).value || null)
              }
            }}
            onChange={(e) => {
              if (!e.target.value) atualizar('busca', null)
            }}
          />
        </div>
        <button
          className={cn('btn-secondary gap-1.5', filtroPainel && 'border-verde-400 text-verde-600')}
          onClick={() => setFiltroPainel(!filtroPainel)}
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filtros</span>
          {temFiltros && (
            <span className="w-2 h-2 bg-verde-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Painel de filtros */}
      {filtroPainel && (
        <div className="bg-white border border-areia-200 rounded-2xl p-4 space-y-4 animate-fade-in">
          {/* Estado */}
          <div>
            <p className="label">Estado de conservação</p>
            <div className="flex flex-wrap gap-2">
              {ESTADOS.map(e => (
                <button
                  key={e.value}
                  onClick={() => atualizar('estado', estadoAtivo === e.value ? null : e.value)}
                  className={cn(
                    'badge-estado cursor-pointer border transition-all',
                    estadoAtivo === e.value ? e.cor : 'bg-white text-gray-500 border-areia-300 hover:border-gray-400'
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <p className="label">Categoria</p>
            <select
              className="input"
              value={categoriaAtiva || ''}
              onChange={(e) => atualizar('categoria', e.target.value || null)}
            >
              <option value="">Todas as categorias</option>
              {CATEGORIAS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Preço */}
          <div>
            <p className="label">Faixa de preço</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Mín"
                className="input w-28"
                value={precoMin}
                min={0}
                onChange={(e) => atualizar('preco_min', e.target.value || null)}
              />
              <span className="text-gray-400 text-sm">até</span>
              <input
                type="number"
                placeholder="Máx"
                className="input w-28"
                value={precoMax}
                min={0}
                onChange={(e) => atualizar('preco_max', e.target.value || null)}
              />
            </div>
          </div>

          {/* Apenas troca */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors',
                somenteTroca ? 'bg-verde-500' : 'bg-areia-300'
              )}
              onClick={() => atualizar('troca', somenteTroca ? null : '1')}
            >
              <div className={cn(
                'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                somenteTroca ? 'translate-x-5' : 'translate-x-1'
              )} />
            </div>
            <span className="text-sm text-gray-700">Apenas disponíveis para troca</span>
          </label>

          {/* Limpar */}
          {temFiltros && (
            <button onClick={limparFiltros} className="btn-ghost text-red-400 text-sm gap-1">
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Chips de filtros ativos */}
      {temFiltros && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400 font-medium">Filtros:</span>
          {estadoAtivo && (
            <button
              onClick={() => atualizar('estado', null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-verde-100 text-verde-700 
                         text-xs font-medium rounded-full border border-verde-200"
            >
              {ESTADOS.find(e => e.value === estadoAtivo)?.label}
              <X size={10} />
            </button>
          )}
          {categoriaAtiva && (
            <button
              onClick={() => atualizar('categoria', null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-verde-100 text-verde-700 
                         text-xs font-medium rounded-full border border-verde-200"
            >
              {CATEGORIAS.find(c => c.value === categoriaAtiva)?.label}
              <X size={10} />
            </button>
          )}
          {somenteTroca && (
            <button
              onClick={() => atualizar('troca', null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-verde-100 text-verde-700 
                         text-xs font-medium rounded-full border border-verde-200"
            >
              Aceita troca
              <X size={10} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
