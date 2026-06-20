import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BookOpen, ArrowLeftRight, ShoppingBag, Wallet } from 'lucide-react'

const tabs = [
  { href: '/painel',              label: 'Resumo',       icon: Wallet },
  { href: '/painel/meus-livros', label: 'Meus livros',  icon: BookOpen },
  { href: '/painel/trocas',      label: 'Trocas',       icon: ArrowLeftRight },
  { href: '/painel/vendas',      label: 'Vendas',       icon: ShoppingBag },
]

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/painel')

  const { data } = await supabase
    .from('profiles')
    .select('nome, saldo, rating')
    .eq('id', user.id)
    .single()

  const profile = data as { nome: string; saldo: number; rating: number } | null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header do painel */}
      <div className="bg-relivra-soft border border-verde-pale rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-verde-deep rounded-full flex items-center justify-center text-white font-display font-bold text-lg">
          {profile?.nome?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-display font-bold text-lg text-grafite">{profile?.nome}</p>
          <div className="flex items-center gap-3 text-sm text-grafite-light">
            <span>⭐ {profile?.rating?.toFixed(1)}</span>
            <span>·</span>
            <span className="text-verde-deep font-medium">
              Saldo: R$ {(profile?.saldo || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs de navegação */}
      <nav className="flex overflow-x-auto gap-1 mb-6 pb-1">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                       text-grafite-light hover:text-grafite hover:bg-areia-100 
                       transition-colors whitespace-nowrap"
          >
            <tab.icon size={16} />
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Conteúdo */}
      {children}
    </div>
  )
}
