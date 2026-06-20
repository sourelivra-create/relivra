import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-areia-100 rounded-3xl flex items-center justify-center mb-6">
        <BookOpen size={36} className="text-areia-400" />
      </div>
      <h1 className="font-display text-3xl font-bold text-grafite">Página não encontrada</h1>
      <p className="text-gray-400 mt-2 max-w-xs">
        O livro que você procura pode ter sido vendido ou trocado.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Ver livros disponíveis
      </Link>
    </div>
  )
}
