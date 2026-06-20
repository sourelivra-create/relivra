'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CadastroPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nome, setNome]         = useState('')
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState('')
  const [sucesso, setSucesso]   = useState(false)

  // Validação de força da senha
  const senhaForte = senha.length >= 8
  const senhaMedia = senha.length >= 6

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome.trim()) { setErro('Informe seu nome'); return }
    if (!email)       { setErro('Informe seu email'); return }
    if (!senhaMedia)  { setErro('Senha deve ter pelo menos 6 caracteres'); return }

    setLoading(true)
    setErro('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome: nome.trim() },
      },
    })

    if (error) {
      setErro(
        error.message.includes('already registered')
          ? 'Este email já está cadastrado. Tente fazer login.'
          : 'Erro ao criar conta. Tente novamente.'
      )
      setLoading(false)
      return
    }

    // Se confirmação de email estiver desabilitada no Supabase, já loga direto
    if (data.session) {
      // window.location força reload completo, garantindo que o middleware
      // já consiga ler o cookie de sessão recém-criado (evita ficar em loop)
      window.location.href = '/painel'
      return
    }

    // Se confirmação estiver habilitada, mostra tela de sucesso
    setSucesso(true)
    setLoading(false)
  }

  if (sucesso) {
    return (
      <div className="card p-6 shadow-float text-center">
        <div className="w-16 h-16 bg-verde-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-verde-600" />
        </div>
        <h2 className="font-display text-xl font-bold text-grafite">Quase lá!</h2>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
          Enviamos um link de confirmação para <strong>{email}</strong>.
          Verifique sua caixa de entrada para ativar sua conta.
        </p>
        <Link href="/login" className="btn-secondary w-full mt-6 justify-center">
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-6 shadow-float">
      <h1 className="font-display text-2xl font-bold text-grafite mb-1">Criar conta</h1>
      <p className="text-gray-500 text-sm mb-6">
        Já tem conta?{' '}
        <Link href="/login" className="text-verde-600 font-medium hover:underline">
          Entrar
        </Link>
      </p>

      {erro && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200
                        rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {erro}
        </div>
      )}

      <form onSubmit={handleCadastro} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="label">Seu nome</label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Como quer ser chamado?"
              value={nome}
              onChange={e => setNome(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
        </div>

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
          <label className="label">Senha</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={verSenha ? 'text' : 'password'}
              className="input pl-10 pr-10"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              autoComplete="new-password"
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

          {/* Indicador de força */}
          {senha && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1 flex-1">
                <div className={`h-1 flex-1 rounded-full transition-colors ${senha.length >= 1 ? 'bg-red-400' : 'bg-areia-200'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors ${senhaMedia ? 'bg-amber-400' : 'bg-areia-200'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors ${senhaForte ? 'bg-verde-500' : 'bg-areia-200'}`} />
              </div>
              <span className="text-xs text-gray-400">
                {senhaForte ? 'Forte' : senhaMedia ? 'Média' : 'Fraca'}
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 mt-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Criando conta...' : 'Criar conta grátis'}
        </button>

        <p className="text-xs text-center text-gray-400 leading-relaxed">
          Ao criar uma conta você concorda com nossos{' '}
          <span className="text-verde-600 cursor-pointer hover:underline">Termos de Uso</span>
        </p>
      </form>
    </div>
  )
}
