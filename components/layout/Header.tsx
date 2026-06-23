'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Plus, LayoutDashboard, LogOut, Menu, X, ChevronDown, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import Logo from './Logo'

interface CategoriaResumo {
  id: string
  nome: string
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const [categoriasAberto, setCategoriasAberto] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaResumo[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Categorias são dinâmicas (a IA pode criar novas), então buscamos
  // a lista atual em vez de usar uma lista fixa no menu.
  useEffect(() => {
    supabase
      .from('categorias')
      .select('id, nome')
      .order('nome', { ascending: true })
      .then(({ data }) => setCategorias(data || []))
  }, [])

  // Fecha o dropdown de categorias ao clicar fora dele
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoriasAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/promocoes', label: 'Promoções' },
    { href: '/mais-vistos', label: 'Mais vistos' },
    { href: '/como-funciona', label: 'Como funciona' },
    { href: '/sobre', label: 'Sobre nós' },
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
            {/* Dropdown de Categorias */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setCategoriasAberto(!categoriasAberto)}
                className={cn(
                  'btn-ghost text-sm gap-1',
                  categoriasAberto && 'text-verde-deep bg-verde-50'
                )}
              >
                Categorias
                <ChevronDown size={14} className={cn('transition-transform', categoriasAberto && 'rotate-180')} />
              </button>

              {categoriasAberto && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-float
                                border border-areia-200 py-2 max-h-80 overflow-y-auto animate-fade-in z-50">
                  {categorias.length === 0 ? (
                    <p className="px-4 py-2 text-sm text-gray-400">Nenhuma categoria ainda</p>
                  ) : (
                    categorias.map(cat => (
                      <Link
                        key={cat.id}
                        href={`/?categoria=${cat.id}`}
                        onClick={() => setCategoriasAberto(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600
                                  hover:bg-verde-50 hover:text-verde-deep transition-colors"
                      >
                        <BookOpen size={14} className="text-areia-400" />
                        {cat.nome}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

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
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuAberto(false)}
                className="btn-ghost w-full justify-start text-sm text-gray-600"
              >
                {link.label}
              </Link>
            ))}

            {categorias.length > 0 && (
              <details className="px-1">
                <summary className="btn-ghost w-full justify-start text-sm text-gray-600 cursor-pointer list-none">
                  Categorias
                </summary>
                <div className="flex flex-col gap-1 pl-4 mt-1">
                  {categorias.map(cat => (
                    <Link
                      key={cat.id}
                      href={`/?categoria=${cat.id}`}
                      onClick={() => setMenuAberto(false)}
                      className="text-sm text-gray-500 hover:text-verde-deep py-1.5"
                    >
                      {cat.nome}
                    </Link>
                  ))}
                </div>
              </details>
            )}

            <div className="border-t border-areia-100 my-2" />

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
