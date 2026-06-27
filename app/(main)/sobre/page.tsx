import Logo from '@/components/layout/Logo'
import { Leaf, Heart, Recycle } from 'lucide-react'

export const metadata = {
  title: 'Sobre nós',
}

export default function SobrePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <Logo iconSize={22} textSize={34} />
        </div>
        <h1 className="font-display text-3xl font-bold text-grafite">
          Dê uma nova vida aos seus livros
        </h1>
        <p className="text-gray-500 mt-3 leading-relaxed">
          A Relivra nasceu de uma ideia simples: livros não deveriam parar empoeirados
          numa estante quando podem continuar circulando, sendo lidos e amados por
          outras pessoas.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex gap-4 items-start">
          <div className="w-11 h-11 bg-verde-50 rounded-2xl flex items-center justify-center shrink-0">
            <Recycle size={20} className="text-verde-deep" />
          </div>
          <div>
            <h3 className="font-display font-bold text-grafite">Economia circular</h3>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Cada livro revendido ou trocado é um livro novo que não precisa ser
              impresso. Menos árvores cortadas, menos papel desperdiçado.
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="w-11 h-11 bg-verde-50 rounded-2xl flex items-center justify-center shrink-0">
            <Heart size={20} className="text-verde-deep" />
          </div>
          <div>
            <h3 className="font-display font-bold text-grafite">Acesso à leitura</h3>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Livros usados custam menos, o que torna a leitura mais acessível para
              quem quer ler mais sem gastar tanto.
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="w-11 h-11 bg-verde-50 rounded-2xl flex items-center justify-center shrink-0">
            <Leaf size={20} className="text-verde-deep" />
          </div>
          <div>
            <h3 className="font-display font-bold text-grafite">Cadastro fácil e rápido</h3>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Nossa IA analisa as fotos do seu livro e preenche o anúncio automaticamente
              — título, autor, categoria, estado e até uma descrição de venda — para você
              focar só em revisar e publicar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
