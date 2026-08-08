import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Relivra – Dê uma nova vida aos seus livros',
    short_name: 'Relivra',
    description: 'Compre, venda e troque livros usados com inteligência. Economia circular para quem ama livros.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F4ED', // areia — cor de fundo do site, usada na splash screen
    theme_color: '#2D6A4F',      // verde-deep — cor primária da marca
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
