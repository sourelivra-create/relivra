import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BookOpen, ArrowLeftRight, ShoppingBag, Wallet, Heart, ShieldCheck, Settings, MessageCircle } from 'lucide-react'

const tabs = [
  { href: '/painel',              label: 'Resumo',       icon: Wallet },
  { href: '/painel/meus-livros', label: 'Meus livros',  icon: BookOpen },
  { href: '/painel/favoritos',   label: 'Favoritos',    icon: Heart },
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
    .select('nome, saldo, rating, is_admin')
    .eq('id', user.id)
    .single()

  const profile = data as { nome: string; saldo: number; rating: number; is_admin: boolean } | null

  // Contagem de mensagens não lidas — duas queries simples (conversas
  // do usuário, depois mensagens não lidas nelas) em vez de um join
  // complexo, já que o volume aqui é sempre pequeno por usuário
  let mensagensNaoLidas = 0
  const { data: minhasConversas } = await supabase
    .from('conversas')
    .select('id')
    .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`)

  const idsConversas = (minhasConversas || []).map(c => c.id)
  if (idsConversas.length > 0) {
    const { count } = await supabase
      .from('mensagens')
      .select('id', { count: 'exact', head: true })
      .in('conversa_id', idsConversas)
      .neq('remetente_id', user.id)
      .is('lida_em', null)
    mensagensNaoLidas = count || 0
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header do painel */}
      <div className="bg-relivra-soft border border-verde-pale rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-verde-deep rounded-full flex items-center justify-center text-white font-display font-bold text-lg">
          {profile?.nome?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-lg text-grafite">{profile?.nome}</p>
          <div className="flex items-center gap-3 text-sm text-grafite-light">
            <span>⭐ {profile?.rating?.toFixed(1)}</span>
            <span>·</span>
            <span className="text-verde-deep font-medium">
              Saldo: R$ {(profile?.saldo || 0).toFixed(2)}
            </span>
          </div>
        </div>
        <Link
          href="/painel/perfil"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                     text-grafite-light hover:text-grafite hover:bg-white/60 transition-colors shrink-0"
        >
          <Settings size={16} />
          <span className="hidden sm:inline">Editar perfil</span>
        </Link>
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

        <Link
          href="/painel/mensagens"
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                     text-grafite-light hover:text-grafite hover:bg-areia-100
                     transition-colors whitespace-nowrap"
        >
          <MessageCircle size={16} />
          Mensagens
          {mensagensNaoLidas > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold
                             w-4 h-4 rounded-full flex items-center justify-center">
              {mensagensNaoLidas > 9 ? '9+' : mensagensNaoLidas}
            </span>
          )}
        </Link>

        {/* Visível apenas para administradores */}
        {profile?.is_admin && (
          <Link
            href="/master"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                       text-grafite bg-grafite/5 hover:bg-grafite/10
                       transition-colors whitespace-nowrap ml-auto"
          >
            <ShieldCheck size={16} />
            Painel Master
          </Link>
        )}
      </nav>

      {/* Conteúdo */}
      {children}
    </div>
  )
}
