import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, Receipt, Users } from 'lucide-react'

const tabs = [
  { href: '/master',             label: 'Visão geral',  icon: LayoutDashboard },
  { href: '/master/transacoes',  label: 'Transações',   icon: Receipt },
  { href: '/master/vendedores',  label: 'Vendedores',   icon: Users },
]

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/master')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  // Proteção real: mesmo que alguém digite a URL direto, sem ser
  // admin é redirecionado para fora — não existe acesso por engano
  if (!perfil?.is_admin) redirect('/')

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-grafite text-white rounded-2xl p-5 mb-6">
        <p className="font-display font-bold text-lg">Painel Master</p>
        <p className="text-sm text-white/60">Controle financeiro da plataforma</p>
      </div>

      <nav className="flex overflow-x-auto gap-1 mb-6 pb-1">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                       text-gray-500 hover:text-grafite hover:bg-areia-100
                       transition-colors whitespace-nowrap"
          >
            <tab.icon size={16} />
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  )
}
