'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, AlertCircle, CheckCircle2, MapPin, Wallet, User, Mail, Lock, Eye, EyeOff
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const TIPOS_CHAVE_PIX = [
  { value: 'CPF', label: 'CPF' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave aleatória' },
]

export default function EditarPerfilPage() {
  const router = useRouter()
  const supabase = createClient()

  const [carregando, setCarregando] = useState(true)
  const [email, setEmail] = useState('')

  const [nome, setNome] = useState('')
  const [cep, setCep] = useState('')
  const [endereco, setEndereco] = useState('')
  const [bairro, setBairro] = useState('')
  const [tipoChavePix, setTipoChavePix] = useState('CPF')
  const [chavePix, setChavePix] = useState('')

  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [erroPerfil, setErroPerfil] = useState('')
  const [sucessoPerfil, setSucessoPerfil] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaNovaConfirma, setSenhaNovaConfirma] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [sucessoSenha, setSucessoSenha] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/painel/perfil')
        return
      }

      setEmail(user.email || '')

      const { data: perfil } = await supabase
        .from('profiles')
        .select('nome, cep, endereco, bairro, tipo_chave_pix, chave_pix')
        .eq('id', user.id)
        .single()

      if (perfil) {
        setNome(perfil.nome || '')
        setCep(perfil.cep || '')
        setEndereco(perfil.endereco || '')
        setBairro(perfil.bairro || '')
        setTipoChavePix(perfil.tipo_chave_pix || 'CPF')
        setChavePix(perfil.chave_pix || '')
      }

      setCarregando(false)
    }

    carregar()
  }, [])

  const handleSalvarPerfil = async () => {
    if (!nome.trim()) {
      setErroPerfil('Informe seu nome')
      return
    }

    setSalvandoPerfil(true)
    setErroPerfil('')
    setSucessoPerfil(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { error } = await supabase
        .from('profiles')
        .update({
          nome: nome.trim(),
          cep: cep.trim() || null,
          endereco: endereco.trim() || null,
          bairro: bairro.trim() || null,
          tipo_chave_pix: chavePix.trim() ? tipoChavePix : null,
          chave_pix: chavePix.trim() || null,
        })
        .eq('id', user.id)

      if (error) throw error

      setSucessoPerfil(true)
      setTimeout(() => setSucessoPerfil(false), 3000)
    } catch (err) {
      console.error(err)
      setErroPerfil('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvandoPerfil(false)
    }
  }

  const handleTrocarSenha = async () => {
    if (!senhaAtual) {
      setErroSenha('Informe sua senha atual')
      return
    }
    if (senhaNova.length < 6) {
      setErroSenha('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    if (senhaNova !== senhaNovaConfirma) {
      setErroSenha('As senhas não coincidem')
      return
    }

    setSalvandoSenha(true)
    setErroSenha('')
    setSucessoSenha(false)

    try {
      const { error: erroLogin } = await supabase.auth.signInWithPassword({
        email,
        password: senhaAtual,
      })

      if (erroLogin) {
        setErroSenha('Senha atual incorreta')
        setSalvandoSenha(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password: senhaNova })
      if (error) throw error

      setSucessoSenha(true)
      setSenhaAtual('')
      setSenhaNova('')
      setSenhaNovaConfirma('')
      setTimeout(() => setSucessoSenha(false), 3000)
    } catch (err) {
      console.error(err)
      setErroSenha('Erro ao trocar senha. Tente novamente.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-verde-500" />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="font-display font-bold text-xl text-grafite">Editar perfil</h2>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-grafite mb-4">
          <User size={16} className="text-verde-deep" />
          Dados pessoais
        </div>

        {erroPerfil && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200
                          rounded-xl p-3 mb-4 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {erroPerfil}
          </div>
        )}

        {sucessoPerfil && (
          <div className="flex items-center gap-2 text-verde-deep bg-verde-50 border border-verde-100
                          rounded-xl p-3 mb-4 text-sm">
            <CheckCircle2 size={16} className="shrink-0" />
            Perfil atualizado com sucesso!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={nome} onChange={e => setNome(e.target.value)} />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Mail size={13} />
              Email
            </label>
            <input className="input bg-areia-50 text-gray-400" value={email} disabled />
            <p className="text-xs text-gray-400 mt-1">O email não pode ser alterado.</p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-grafite mb-4">
          <MapPin size={16} className="text-verde-deep" />
          Endereço (Petrópolis)
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">CEP</label>
            <input className="input" value={cep} onChange={e => setCep(e.target.value)} placeholder="25600-000" maxLength={9} />
          </div>
          <div>
            <label className="label">Endereço (rua e número)</label>
            <input className="input" value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua das Flores, 123" />
          </div>
          <div>
            <label className="label">Bairro</label>
            <input className="input" value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Centro" />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-grafite mb-4">
          <Wallet size={16} className="text-verde-deep" />
          Chave Pix para receber repasses
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={tipoChavePix} onChange={e => setTipoChavePix(e.target.value)}>
              {TIPOS_CHAVE_PIX.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Chave</label>
            <input className="input" value={chavePix} onChange={e => setChavePix(e.target.value)} placeholder="Sua chave Pix" />
          </div>
        </div>
      </div>

      <button onClick={handleSalvarPerfil} disabled={salvandoPerfil} className="btn-primary w-full py-3">
        {salvandoPerfil && <Loader2 size={16} className="animate-spin" />}
        {salvandoPerfil ? 'Salvando...' : 'Salvar alterações'}
      </button>

      <div className="card p-5 mt-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-grafite mb-4">
          <Lock size={16} className="text-verde-deep" />
          Trocar senha
        </div>

        {erroSenha && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200
                          rounded-xl p-3 mb-4 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {erroSenha}
          </div>
        )}

        {sucessoSenha && (
          <div className="flex items-center gap-2 text-verde-deep bg-verde-50 border border-verde-100
                          rounded-xl p-3 mb-4 text-sm">
            <CheckCircle2 size={16} className="shrink-0" />
            Senha alterada com sucesso!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">Senha atual</label>
            <div className="relative">
              <input
                type={verSenha ? 'text' : 'password'}
                className="input pr-10"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                autoComplete="current-password"
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

          <div>
            <label className="label">Nova senha</label>
            <input
              type={verSenha ? 'text' : 'password'}
              className="input"
              value={senhaNova}
              onChange={e => setSenhaNova(e.target.value)}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="label">Confirmar nova senha</label>
            <input
              type={verSenha ? 'text' : 'password'}
              className="input"
              value={senhaNovaConfirma}
              onChange={e => setSenhaNovaConfirma(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button onClick={handleTrocarSenha} disabled={salvandoSenha} className="btn-secondary w-full py-3 mt-4">
          {salvandoSenha && <Loader2 size={16} className="animate-spin" />}
          {salvandoSenha ? 'Trocando...' : 'Trocar senha'}
        </button>
      </div>
    </div>
  )
}
