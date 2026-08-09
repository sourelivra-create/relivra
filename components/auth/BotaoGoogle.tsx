'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BotaoGoogleProps {
  redirect?: string
}

// Ícone oficial do Google (multi-color) — SVG inline, sem dependência externa
function IconeGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
    </svg>
  )
}

export default function BotaoGoogle({ redirect = '/painel' }: BotaoGoogleProps) {
  const [carregando, setCarregando] = useState(false)
  const supabase = createClient()

  const handleClick = async () => {
    setCarregando(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Volta pro nosso callback, que troca o código pela sessão e
        // só então manda pra rota que o usuário queria acessar
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    })
    // Não precisa de setCarregando(false) — a página vai navegar pro
    // Google nesse meio tempo, então o componente nem continua montado
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={carregando}
      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl
                 border border-areia-300 bg-white hover:bg-areia-50
                 text-sm font-medium text-grafite transition-colors disabled:opacity-60"
    >
      <IconeGoogle />
      {carregando ? 'Redirecionando...' : 'Continuar com Google'}
    </button>
  )
}
