'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Camera, Star, Loader2, AlertCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ConfirmarRecebimentoProps {
  orderId: string
  vendedorId: string
  vendedorNome: string
}

export default function ConfirmarRecebimento({ orderId, vendedorId, vendedorNome }: ConfirmarRecebimentoProps) {
  const router = useRouter()
  const supabase = createClient()

  const [aberto, setAberto] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [nota, setNota] = useState(5)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const handleFoto = (file: File) => {
    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleConfirmar = async () => {
    if (!foto) {
      setErro('A foto é obrigatória para confirmar o recebimento')
      return
    }

    setEnviando(true)
    setErro('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const ext = foto.name.split('.').pop()
      const path = `${orderId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('confirmacoes-entrega')
        .upload(path, foto)

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from('confirmacoes-entrega')
        .getPublicUrl(path)

      const res = await fetch('/api/pedidos/confirmar-recebimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          vendedor_id: vendedorId,
          foto_url: urlData.publicUrl,
          nota,
          comentario: comentario.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao confirmar')

      setAberto(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      setErro('Não foi possível confirmar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="btn-primary w-full mt-2 py-2 text-sm"
      >
        <CheckCircle2 size={16} />
        Confirmar recebimento
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-bold text-lg text-grafite">Confirmar recebimento</p>
              <button onClick={() => setAberto(false)} className="btn-ghost p-2 text-gray-400">
                <X size={18} />
              </button>
            </div>

            {erro && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200
                              rounded-xl p-3 mb-4 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                {erro}
              </div>
            )}

            <label className="label">Foto do livro recebido *</label>
            <label className="block border-2 border-dashed border-areia-300 rounded-2xl p-6
                              text-center cursor-pointer hover:border-verde-400 transition-colors mb-4">
              {fotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoPreview} alt="Foto" className="w-24 h-32 object-cover mx-auto rounded-lg" />
              ) : (
                <>
                  <Camera size={28} className="mx-auto text-areia-400 mb-2" />
                  <p className="text-sm text-gray-500">Toque para tirar/enviar foto</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFoto(f) }}
              />
            </label>

            <label className="label">Como foi com {vendedorNome}?</label>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setNota(i)} type="button">
                  <Star
                    size={28}
                    className={cn(i <= nota ? 'text-amber-400 fill-amber-400' : 'text-areia-300')}
                  />
                </button>
              ))}
            </div>

            <textarea
              className="input resize-none mb-4"
              rows={2}
              placeholder="Comentário (opcional)"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            />

            <button
              onClick={handleConfirmar}
              disabled={enviando}
              className="btn-primary w-full py-3"
            >
              {enviando && <Loader2 size={16} className="animate-spin" />}
              {enviando ? 'Confirmando...' : 'Confirmar recebimento'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
