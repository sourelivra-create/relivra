'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/painel'
  const supabase = createClient()

  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !senha) { setErro('Preencha email e senha'); return }

    setLoading(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro(
        error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : 'Erro ao entrar. Tente novamente.'
      )
      setLoading(false)
      return
    }

    // Usamos window.location em vez de router.push para forçar um reload
    // completo da página. Isso garante que o cookie de sessão já esteja
    // salvo e disponível para o middleware antes da próxima navegação,
    // evitando que ele nos mande de volta para o login por engano.
    window.location.href = redirect
  }

  return (
    <div className="card p-6 shadow-float">
      <h1 className="font-display text-2xl font-bold text-grafite mb-1">Entrar</h1>
      <p className="text-gray-500 text-sm mb-6">
        Não tem conta?{' '}
        <Link href="/cadastro" className="text-verde-600 font-medium hover:underline">
          Cadastre-se grátis
        </Link>
      </p>

      {erro && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200
                        rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {erro}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              className="input pl-10"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Senha */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Senha</label>
            <Link href="/recuperar-senha" className="text-xs text-verde-600 hover:underline">
              Esqueceu?
            </Link>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={verSenha ? 'text' : 'password'}
              className="input pl-10 pr-10"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setVerSenha(!verSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {verSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 mt-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
