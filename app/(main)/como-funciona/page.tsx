import { Camera, Tag, ShoppingCart, ArrowLeftRight, Sparkles, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Como funciona',
}

const passos = [
  {
    icon: Camera,
    titulo: '1. Fotografe seu livro',
    texto: 'Tire fotos da capa, página interna e verso. Assim que as 3 fotos forem enviadas, nossa IA já começa a analisar.',
  },
  {
    icon: Sparkles,
    titulo: '2. A IA preenche pra você',
    texto: 'Título, autor, categoria, edição, estado de conservação e até uma descrição de venda são preenchidos automaticamente — você só revisa e ajusta o que quiser.',
  },
  {
    icon: Tag,
    titulo: '3. Defina o preço',
    texto: 'Você escolhe o preço final de venda. A IA sugere referências (venda rápida, sugerido, máximo) com base no estado e no mercado, mas a decisão é sempre sua.',
  },
  {
    icon: ShoppingCart,
    titulo: '4. Venda ou troque',
    texto: 'Outros usuários podem comprar seu livro via Pix/cartão, direto no site, ou propor uma troca por outro livro do seu interesse.',
  },
]

export default function ComoFuncionaPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display text-3xl font-bold text-grafite">Como funciona</h1>
        <p className="text-gray-500 mt-2">
          Dar uma nova vida a um livro é simples. Veja o passo a passo.
        </p>
      </div>

      <div className="space-y-6">
        {passos.map((passo, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-verde-50 rounded-2xl flex items-center justify-center shrink-0">
              <passo.icon size={22} className="text-verde-deep" />
            </div>
            <div>
              <h3 className="font-display font-bold text-grafite">{passo.titulo}</h3>
              <p className="text-gray-500 text-sm mt-1 leading-relaxed">{passo.texto}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Seção sobre trocas */}
      <div className="mt-16 bg-relivra-soft border border-verde-pale rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-card">
            <ArrowLeftRight size={22} className="text-verde-deep" />
          </div>
          <h2 className="font-display text-xl font-bold text-grafite">Como funciona a troca</h2>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-verde-deep mt-0.5 shrink-0" />
            <p>Encontre um livro que aceita troca e selecione um ou mais livros seus para oferecer.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-verde-deep mt-0.5 shrink-0" />
            <p>A plataforma calcula automaticamente o valor equivalente de cada lado da troca.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-verde-deep mt-0.5 shrink-0" />
            <p>O outro usuário pode aceitar ou recusar sua proposta — sem compromisso até a confirmação.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-verde-deep mt-0.5 shrink-0" />
            <p>Trocas com diferença de valor são permitidas — o sistema mostra isso claramente antes de você confirmar.</p>
          </div>
        </div>
      </div>

      <div className="text-center mt-12">
        <Link href="/vender" className="btn-primary">
          Publicar meu primeiro livro
        </Link>
      </div>
    </div>
  )
}
