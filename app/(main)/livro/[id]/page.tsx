import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda, formatarData, cn } from '@/lib/utils'
import { corEstado, labelEstado } from '@/lib/preco/calcular'
import { Star, Calendar, User, BookOpen, Sparkles, AlertCircle } from 'lucide-react'
import BotoesAcao from './BotoesAcao'
import GaleriaFotos from './GaleriaFotos'
import BotaoAvaliacaoIA from '@/components/livros/BotaoAvaliacaoIA'
import { MAX_TENTATIVAS_AVALIACAO_IA } from '@/lib/ia/analisar-livro'
import type { Book, Categoria, Profile } from '@/types/database.types'

interface PageProps {
  params: { id: string }
}

type LivroComJoins = Book & {
  vendedor: Pick<Profile, 'id' | 'nome' | 'rating' | 'avatar_url'>
  categoria: Pick<Categoria, 'id' | 'nome'>
}

export default async function PaginaLivro({ params }: PageProps) {
  const supabase = createClient()

  const { data: livro } = await supabase
    .from('books')
    .select('*, vendedor:profiles(id, nome, rating, avatar_url), categoria:categorias(id, nome)')
    .eq('id', params.id)
    .single() as { data: LivroComJoins | null }

  if (!livro) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isProprioLivro = user?.id === livro.vendedor_id

  // Fallback para livros antigos que só tinham imagem_url (1 foto)
  const fotos = livro.fotos?.length ? livro.fotos : (livro.imagem_url ? [livro.imagem_url] : [])
  const tentativasRestantes = MAX_TENTATIVAS_AVALIACAO_IA - (livro.tentativas_avaliacao_ia || 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Galeria de fotos */}
        <GaleriaFotos fotos={fotos} titulo={livro.titulo} vendido={livro.vendido} />

        {/* Info */}
        <div className="flex flex-col">
          {/* Estado declarado pelo vendedor */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={cn('badge-estado w-fit', corEstado(livro.estado))}>
              {labelEstado(livro.estado)}
              {livro.nota_estado != null && (
                <span className="ml-1 opacity-60">({livro.nota_estado}/10)</span>
              )}
            </span>
            <span className="text-xs text-gray-400">declarado pelo vendedor</span>
          </div>

          {/* Segunda opinião da IA — só aparece se já foi avaliado */}
          {livro.status_avaliacao_ia === 'CONCLUIDA' && livro.estado_ia && (
            <div className="flex items-start gap-2 bg-verde-50 border border-verde-100 rounded-xl p-3 mb-4">
              <Sparkles size={16} className="text-verde-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-verde-700">
                  Avaliação da IA: {labelEstado(livro.estado_ia)}
                  {livro.nota_ia != null && ` (${livro.nota_ia}/10)`}
                </p>
                {livro.descricao_estado_ia && (
                  <p className="text-xs text-gray-500 mt-0.5">{livro.descricao_estado_ia}</p>
                )}
                {livro.estado_ia !== livro.estado && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Diverge da avaliação do vendedor — confira as fotos com atenção
                  </p>
                )}
              </div>
            </div>
          )}

          {livro.status_avaliacao_ia === 'PROCESSANDO' && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-areia-50 rounded-xl p-3 mb-4 border border-areia-200">
              <Sparkles size={14} className="animate-pulse text-verde-500" />
              Aguardando avaliação da IA...
            </div>
          )}

          <h1 className="font-display text-2xl md:text-3xl font-bold text-grafite leading-tight text-balance">
            {livro.titulo}
          </h1>
          <p className="text-gray-500 text-lg mt-1">{livro.autor}</p>
          {livro.versao && (
            <p className="text-gray-400 text-sm mt-0.5">{livro.versao}</p>
          )}

          {/* Preço */}
          <div className="mt-6">
            <p className="text-verde-600 font-bold text-3xl">{formatarMoeda(livro.preco)}</p>
            {livro.preco_sugerido && livro.preco !== livro.preco_sugerido && (
              <p className="text-xs text-gray-400 mt-0.5">
                Preço sugerido: {formatarMoeda(livro.preco_sugerido)}
              </p>
            )}
          </div>

          {/* Descrição */}
          {livro.descricao && (
            <p className="text-gray-600 text-sm leading-relaxed mt-4 p-4 bg-areia-50 rounded-xl border border-areia-200">
              {livro.descricao}
            </p>
          )}

          {/* Detalhes */}
          <div className="mt-4 space-y-2 text-sm text-gray-500">
            {livro.categoria && (
              <div className="flex items-center gap-2">
                <BookOpen size={14} />
                <span>{livro.categoria.nome}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>Publicado em {formatarData(livro.created_at)}</span>
            </div>
          </div>

          {/* Vendedor */}
          <div className="mt-6 p-4 bg-areia-50 rounded-xl border border-areia-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-verde-100 rounded-full flex items-center justify-center">
              <User size={18} className="text-verde-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Vendedor</p>
              <p className="text-sm font-semibold text-gray-800">{livro.vendedor?.nome}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i}
                    size={10}
                    className={i <= Math.round(livro.vendedor?.rating || 5)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-areia-300'
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Botão de avaliação IA — só o dono vê */}
          {isProprioLivro && livro.status_avaliacao_ia !== 'CONCLUIDA' && (
            <div className="mt-4">
              <BotaoAvaliacaoIA
                livroId={livro.id}
                statusAtual={livro.status_avaliacao_ia}
                tentativasRestantes={tentativasRestantes}
              />
            </div>
          )}

          {/* Botões de ação */}
          <div className="mt-6 space-y-3">
            {isProprioLivro ? (
              <div className="space-y-2">
                <Link href={`/painel/meus-livros`} className="btn-secondary w-full">
                  Gerenciar meus livros
                </Link>
              </div>
            ) : livro.vendido ? (
              <p className="text-center text-gray-400 text-sm py-4">Este livro não está mais disponível.</p>
            ) : (
              <BotoesAcao
                livroId={livro.id}
                aceitaTroca={livro.aceita_troca}
                userId={user?.id || null}
                vendedorId={livro.vendedor_id}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
