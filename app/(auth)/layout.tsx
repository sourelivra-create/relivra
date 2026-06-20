import Link from 'next/link'
import Logo from '@/components/layout/Logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-relivra-soft flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href="/" className="mb-8">
        <Logo size={34} />
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm">
        {children}
      </div>

      <p className="mt-8 text-xs text-grafite-light text-center">
        Dê uma nova vida aos seus livros ♻️
      </p>
    </div>
  )
}
