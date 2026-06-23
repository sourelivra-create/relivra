import type { EstadoLivro } from '@/types/database.types'

// Percentual do preço de mercado por estado
const PERCENTUAL_POR_ESTADO: Record<EstadoLivro, number> = {
  OTIMO:   0.80,
  BOM:     0.60,
  REGULAR: 0.40,
  RUIM:    0.20,
}

const PRECO_MINIMO = 5
const PRECO_MAXIMO_BUSCA = 200 // Limite razoável para mock/api

interface PrecoMercado {
  titulo: string
  autor: string
  preco_medio: number
  fonte: 'google_books' | 'mock'
}

/**
 * Busca preço médio de mercado via Google Books API
 * Se falhar, usa mock baseado em heurística
 */
async function buscarPrecoMercado(titulo: string, autor: string): Promise<PrecoMercado> {
  try {
    const query = encodeURIComponent(`${titulo} ${autor}`)
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5&printType=books`

    const response = await fetch(url, { next: { revalidate: 3600 } }) // Cache 1h
    if (!response.ok) throw new Error('Google Books API falhou')

    const data = await response.json()
    const items = data.items || []

    // Extrair preços dos livros encontrados
    const precos = items
      .map((item: { saleInfo?: { listPrice?: { amount?: number } } }) => item?.saleInfo?.listPrice?.amount)
      .filter((p: unknown): p is number => typeof p === 'number' && p > 0 && p <= PRECO_MAXIMO_BUSCA)

    if (precos.length > 0) {
      const media = precos.reduce((a: number, b: number) => a + b, 0) / precos.length
      return {
        titulo,
        autor,
        preco_medio: Number(media.toFixed(2)),
        fonte: 'google_books',
      }
    }
  } catch {
    // Silently fall through to mock
  }

  // Mock baseado em categoria/heurística
  return {
    titulo,
    autor,
    preco_medio: precoPadraoPorMock(titulo),
    fonte: 'mock',
  }
}

/**
 * Mock heurístico: livros mais longos/específicos costumam ser mais caros
 */
function precoPadraoPorMock(titulo: string): number {
  const comprimento = titulo.length
  if (comprimento < 10) return 39.90
  if (comprimento < 20) return 44.90
  return 54.90
}

/**
 * Calcula preço sugerido para o livro
 * Preço = Preço de mercado × Percentual do estado
 */
export async function calcularPrecoSugerido(
  titulo: string,
  autor: string,
  estado: EstadoLivro
): Promise<{ preco_sugerido: number; preco_mercado: number; fonte: string }> {
  const mercado = await buscarPrecoMercado(titulo, autor)
  const percentual = PERCENTUAL_POR_ESTADO[estado]
  const precoCalculado = mercado.preco_medio * percentual
  const precoFinal = Math.max(PRECO_MINIMO, Number(precoCalculado.toFixed(2)))

  return {
    preco_sugerido: precoFinal,
    preco_mercado: mercado.preco_medio,
    fonte: mercado.fonte,
  }
}

/**
 * Retorna label amigável do estado
 */
export function labelEstado(estado: EstadoLivro): string {
  const labels: Record<EstadoLivro, string> = {
    OTIMO: 'Ótimo',
    BOM: 'Bom',
    REGULAR: 'Regular',
    RUIM: 'Ruim',
  }
  return labels[estado]
}

/**
 * Retorna cor Tailwind do estado
 */
export function corEstado(estado: EstadoLivro): string {
  const cores: Record<EstadoLivro, string> = {
    OTIMO:   'bg-verde-100 text-verde-700 border-verde-200',
    BOM:     'bg-amber-100 text-amber-700 border-amber-200',
    REGULAR: 'bg-orange-100 text-orange-700 border-orange-200',
    RUIM:    'bg-red-100 text-red-700 border-red-200',
  }
  return cores[estado]
}

export { PERCENTUAL_POR_ESTADO }

// ============================================================
// Precificação final (taxa de referência + taxa administrativa)
// ============================================================
//
// Regra de negócio:
// - O vendedor digita o PREÇO DE VENDA — é esse valor que aparece
//   ao comprador, sem nenhum acréscimo.
// - O sistema desconta, do preço de venda: taxa de referência
//   (sempre a taxa mais alta do gateway, cartão de crédito) +
//   taxa administrativa da plataforma. O que resta é o líquido
//   que o vendedor recebe.
// - Se o pagamento real for via Pix (taxa real menor que a de
//   referência), a diferença economizada fica como margem extra
//   da Relivra — o preço para o comprador NÃO muda entre métodos,
//   e o vendedor recebe o mesmo valor líquido sempre.

export const TAXA_REFERENCIA_PAGAMENTO = 0.0499  // taxa de cartão de crédito do MP
export const TAXA_ADMINISTRATIVA_RELIVRA = 0.10   // taxa administrativa da plataforma

export interface CalculoPreco {
  precoVenda: number        // o que o vendedor digitou (= o que o comprador vê)
  taxaReferencia: number    // valor em R$ da taxa de pagamento descontada
  taxaAdministrativa: number // valor em R$ da taxa administrativa descontada
  precoLiquido: number      // o que o vendedor efetivamente recebe
}

/**
 * Calcula o valor líquido que o vendedor recebe a partir do
 * preço de venda que ele digitou (o preço que o comprador vê).
 */
export function calcularPrecoFinal(precoVenda: number): CalculoPreco {
  const taxaReferencia = Number((precoVenda * TAXA_REFERENCIA_PAGAMENTO).toFixed(2))
  const taxaAdministrativa = Number((precoVenda * TAXA_ADMINISTRATIVA_RELIVRA).toFixed(2))
  const precoLiquido = Number((precoVenda - taxaReferencia - taxaAdministrativa).toFixed(2))

  return { precoVenda, taxaReferencia, taxaAdministrativa, precoLiquido }
}


