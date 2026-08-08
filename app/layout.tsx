import type { Metadata } from 'next'
import { Sora, Inter } from 'next/font/google'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Relivra – Dê uma nova vida aos seus livros',
    template: '%s | Relivra',
  },
  description:
    'Compre, venda e troque livros usados com inteligência. Economia circular para quem ama livros.',
  keywords: ['livros usados', 'troca de livros', 'livros segunda mão', 'economia circular'],
  openGraph: {
    title: 'Relivra',
    description: 'Dê uma nova vida aos seus livros',
    type: 'website',
  },
  // PWA — Android usa o manifest.ts (app/manifest.ts) automaticamente.
  // iOS/Safari ignora boa parte do manifest e depende dessas meta tags
  // específicas pra "Adicionar à Tela de Início" funcionar direito.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Relivra',
  },
}

export const viewport = {
  themeColor: '#2D6A4F',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${inter.variable}`}>
      <body className="bg-creme text-grafite antialiased">
        {children}
      </body>
    </html>
  )
}
