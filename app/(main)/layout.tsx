import Header from '@/components/layout/Header'
import Logo from '@/components/layout/Logo'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-64px)]">
        {children}
      </main>
      <footer className="bg-grafite mt-16">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col items-center gap-4 text-center">
          <Logo size={26} variant="white" />
          <p className="text-white/30 text-xs tracking-wide">
            Relivra ·{' '}
            <a
              href="https://up3base.com.br"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
              className="hover:text-white/50 transition-colors"
            >
              UP3BASE Ecossistema
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}
