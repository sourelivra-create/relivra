'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, MapPin, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CompletarPerfilProps {
  onCompleto: () => void
}

const TIPOS_CHAVE_PIX = [
  { value: 'CPF', label: 'CPF' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave aleatória' },
]

export default function CompletarPerfil({ onCompleto }: CompletarPerfilProps) {
  const supabase = createClient()

  const [cep, setCep] = useState('')
  const [endereco, setEndereco] = useState('')
  const [bairro, setBairro] = useState('')
  const [tipoChavePix, setTipoChavePix] = useState('CPF')
  const [chavePix, setChavePix] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const handleSalvar = async () => {
    if (!cep.trim() || !endereco.trim() || !bairro.trim()) {
      setErro('Preencha o endereço completo')
      return
    }
    if (!chavePix.trim()) {
      setErro('Informe sua chave Pix para receber os repasses')
      return
    }

    setSalvando(true)
    setErro('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { error } = await supabase
        .from('profiles')
        .update({
          cep: cep.trim(),
          endereco: endereco.trim(),
          bairro: bairro.trim(),
          tipo_chave_pix: tipoChavePix,
          chave_pix: chavePix.trim(),
        })
        .eq('id', user.id)

      if (error) throw error

      onCompleto()
    } catch (err) {
      console.error(err)
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-grafite">Antes de vender...</h1>
        <p className="text-gray-500 text-sm mt-2">
          Precisamos do seu endereço e chave Pix para os encontros e repasses
        </p>
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200
                        rounded-xl p-3 mb-4 text-sm">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-grafite">
          <MapPin size={16} className="text-verde-deep" />
          Endereço (Petrópolis)
        </div>

        <div>
          <label className="label">CEP</label>
          <input
            className="input"
            value={cep}
            onChange={e => setCep(e.target.value)}
            placeholder="25600-000"
            maxLength={9}
          />
        </div>

        <div>
          <label className="label">Endereço (rua e número)</label>
          <input
            className="input"
            value={endereco}
            onChange={e => setEndereco(e.target.value)}
            placeholder="Rua das Flores, 123"
          />
        </div>

        <div>
          <label className="label">Bairro</label>
          <input
            className="input"
            value={bairro}
            onChange={e => setBairro(e.target.value)}
            placeholder="Centro"
          />
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold text-grafite pt-2">
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
            <input
              className="input"
              value={chavePix}
              onChange={e => setChavePix(e.target.value)}
              placeholder="Sua chave Pix"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="btn-primary w-full py-3 mt-6"
      >
        {salvando && <Loader2 size={16} className="animate-spin" />}
        {salvando ? 'Salvando...' : 'Continuar para o cadastro do livro'}
      </button>
    </div>
  )
}
