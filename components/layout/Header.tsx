'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Plus, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import Logo from './Logo'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: 'Livros' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-areia-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Logo size={30} />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'btn-ghost text-sm',
                  pathname === link.href && 'text-verde-deep bg-verde-50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Ações desktop */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link href="/vender" className="btn-primary gap-1.5">
                  <Plus size={16} />
                  Vender livro
                </Link>
                <Link href="/painel" className={cn(
                  'btn-ghost',
                  pathname.startsWith('/painel') && 'text-verde-deep bg-verde-50'
                )}>
                  <LayoutDashboard size={16} />
                  Painel
                </Link>
                <button onClick={handleLogout} className="btn-ghost text-gray-400">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary">Entrar</Link>
                <Link href="/cadastro" className="btn-primary">Cadastrar</Link>
              </>
            )}
          </div>

          {/* Botão menu mobile */}
          <button
            className="md:hidden btn-ghost p-2"
            onClick={() => setMenuAberto(!menuAberto)}
            aria-label="Menu"
          >
            {menuAberto ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {menuAberto && (
        <div className="md:hidden border-t border-areia-200 bg-white animate-fade-in">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/vender" className="btn-primary w-full" onClick={() => setMenuAberto(false)}>
                  <Plus size={16} />
                  Vender livro
                </Link>
                <Link href="/painel" className="btn-secondary w-full" onClick={() => setMenuAberto(false)}>
                  <LayoutDashboard size={16} />
                  Meu Painel
                </Link>
                <button onClick={handleLogout} className="btn-ghost w-full text-gray-500 justify-center">
                  <LogOut size={16} />
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary w-full" onClick={() => setMenuAberto(false)}>
                  Entrar
                </Link>
                <Link href="/cadastro" className="btn-primary w-full" onClick={() => setMenuAberto(false)}>
                  Cadastrar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
