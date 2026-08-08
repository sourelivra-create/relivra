'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, Check, X, ShieldCheck } from 'lucide-react'
import { formatarData } from '@/lib/utils'

interface UsuarioCardProps {
  usuario: {
    id: string
    nome: string
    email: string
    rating: number
    saldo: number
    created_at: string
    is_admin: boolean
  }
}

export default function UsuarioCard({ usuario }: UsuarioCardProps) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [novoEmail, setNovoEmail] = useState(usuario.email)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const handleSalvar = async () => {
    if (!novoEmail.trim() || !novoEmail.includes('@')) {
      setErro('Email inválido')
      return
    }

    setSalvando(true)
    setErro('')

    try {
      const res = await fetch('/api/master/usuarios/editar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuario.id, novo_email: novoEmail.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')

      setEditando(false)
      router.refresh()
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-10 h-10 bg-verde-deep rounded-full flex items-center justify-center text-white font-display font-bold shrink-0">
        {usuario.nome?.charAt(0).toUpperCase() || '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-grafite truncate">{usuario.nome}</p>
          {usuario.is_admin && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-verde-deep bg-verde-50 px-2 py-0.5 rounded-full shrink-0">
              <ShieldCheck size={10} />
              Admin
            </span>
          )}
        </div>

        {editando ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              className="input py-1 text-sm flex-1"
              value={novoEmail}
              onChange={e => setNovoEmail(e.target.value)}
              autoFocus
            />
            <button onClick={handleSalvar} disabled={salvando} className="btn-ghost p-1.5 text-verde-deep">
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button onClick={() => { setEditando(false); setNovoEmail(usuario.email); setErro('') }} className="btn-ghost p-1.5 text-gray-400">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-gray-400 truncate">{usuario.email}</p>
            <button onClick={() => setEditando(true)} className="text-gray-300 hover:text-grafite shrink-0">
              <Pencil size={11} />
            </button>
          </div>
        )}

        {erro && <p className="text-xs text-red-500 mt-1">{erro}</p>}

        <p className="text-xs text-gray-400 mt-0.5">
          ⭐ {usuario.rating?.toFixed(1)} · Cadastrado em {formatarData(usuario.created_at)}
        </p>
      </div>

      <p className="text-sm font-semibold text-verde-deep shrink-0">
        R$ {(usuario.saldo || 0).toFixed(2)}
      </p>
    </div>
  )
}
