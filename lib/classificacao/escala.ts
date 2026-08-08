import type { ClassificacaoLivro, DestinoLivro, EstadoLivro } from '@/types/database.types'

// ============================================================
// ATENÇÃO — fonte única da verdade duplicada por necessidade
// ============================================================
// Os thresholds abaixo (9.5, 8.5, 7.5...) precisam ser IDÊNTICOS
// aos das funções calcular_destino_livro() e
// calcular_classificacao_livro() no banco (migrations 009 e 010).
// Se um dia mudar aqui, muda lá também — senão o formulário mostra
// uma classificação e o banco salva outra.
// ============================================================

export interface NivelClassificacao {
  /** Nota representativa do nível, 1-10 (número inteiro) */
  valor: number
  enumValue: ClassificacaoLivro
  label: string
  descricao: string
  /** Destino que esse nível implica — só informativo no front,
   *  quem decide de verdade é o trigger do banco */
  destino: DestinoLivro
}

// Ordenado do melhor (10) para o pior (1) — pensado para exibição
// em <select>, do topo (mais valioso) para a base
export const ESCALA_CLASSIFICACAO: NivelClassificacao[] = [
  {
    valor: 10,
    enumValue: 'EXCELENTE',
    label: 'Excelente',
    descricao: 'Sem uso aparente, como novo, sem marcas ou dobras',
    destino: 'VENDA',
  },
  {
    valor: 9,
    enumValue: 'NOVO',
    label: 'Novo',
    descricao: 'Lido no máximo uma vez, sem marcas visíveis',
    destino: 'VENDA',
  },
  {
    valor: 8,
    enumValue: 'OTIMO',
    label: 'Ótimo',
    descricao: 'Pequenos sinais de uso, capa e miolo em ótimo estado',
    destino: 'VENDA',
  },
  {
    valor: 7,
    enumValue: 'MUITO_BOM',
    label: 'Muito Bom',
    descricao: 'Uso normal, sem rasuras, lombada firme',
    destino: 'VENDA',
  },
  {
    valor: 6,
    enumValue: 'BOM',
    label: 'Bom',
    descricao: 'Marcas leves de uso, capa com pequenos desgastes',
    destino: 'VENDA',
  },
  {
    valor: 5,
    enumValue: 'REGULAR',
    label: 'Regular',
    descricao: 'Uso evidente, pode ter grifos leves ou capa desgastada',
    destino: 'VENDA',
  },
  {
    valor: 4,
    enumValue: 'RUIM',
    label: 'Ruim',
    descricao: 'Desgaste considerável, grifos ou rasuras presentes',
    destino: 'DOACAO',
  },
  {
    valor: 3,
    enumValue: 'MUITO_RUIM',
    label: 'Muito Ruim',
    descricao: 'Páginas soltas ou danificadas, uso pesado',
    destino: 'DOACAO',
  },
  {
    valor: 2,
    enumValue: 'PESSIMO',
    label: 'Péssimo',
    descricao: 'Danos estruturais, faltam páginas ou capa',
    destino: 'DOACAO',
  },
  {
    valor: 1,
    enumValue: 'INUTILIZAVEL',
    label: 'Inutilizável',
    descricao: 'Só serve como doação para reaproveitamento ou reciclagem',
    destino: 'DOACAO',
  },
]

/**
 * Nota (0-10, aceita fração) → nível de classificação.
 * Espelha EXATAMENTE calcular_classificacao_livro() no banco.
 */
export function nivelPorNota(nota: number): ClassificacaoLivro {
  if (nota >= 9.5) return 'EXCELENTE'
  if (nota >= 8.5) return 'NOVO'
  if (nota >= 7.5) return 'OTIMO'
  if (nota >= 6.5) return 'MUITO_BOM'
  if (nota >= 5.5) return 'BOM'
  if (nota >= 4.5) return 'REGULAR'
  if (nota >= 3.5) return 'RUIM'
  if (nota >= 2.5) return 'MUITO_RUIM'
  if (nota >= 1.5) return 'PESSIMO'
  return 'INUTILIZAVEL'
}

/**
 * Classificação → nota representativa (1-10, inteiro).
 * Direção inversa de nivelPorNota — usada para preencher o preço
 * sugerido e outras contas que dependem de um número.
 */
export function nivelPorValor(classificacao: ClassificacaoLivro): number {
  const encontrado = ESCALA_CLASSIFICACAO.find(n => n.enumValue === classificacao)
  return encontrado?.valor ?? 5
}

/**
 * Espelha calcular_destino_livro() do banco — só para a UI decidir
 * o que mostrar ANTES de salvar (aviso amarelo, esconder preço).
 * Quem decide de verdade, na hora de salvar, é o trigger do banco.
 */
export function ehDoacao(nota: number): boolean {
  return nota < 4.5
}

// ============================================================
// Pontuação por classificação — CONFIRMADO pelo Pablo (não é mais
// palpite). Fórmula: valor_venda ÷ 10 + bônus.
// EXCELENTE +1.00 / NOVO +0.75 / OTIMO +0.50 / MUITO_BOM +0.25 /
// BOM e abaixo, sem bônus.
// ============================================================
const BONUS_POR_CLASSIFICACAO: Record<ClassificacaoLivro, number> = {
  EXCELENTE: 1.00,
  NOVO: 0.75,
  OTIMO: 0.50,
  MUITO_BOM: 0.25,
  BOM: 0,
  REGULAR: 0,
  RUIM: 0,       // não deveria nem chegar aqui (é doação, não venda)
  MUITO_RUIM: 0,
  PESSIMO: 0,
  INUTILIZAVEL: 0,
}

export function calcularPontos(valorVenda: number, classificacao: ClassificacaoLivro): number {
  const base = valorVenda / 10
  const bonus = BONUS_POR_CLASSIFICACAO[classificacao] ?? 0
  return Number((base + bonus).toFixed(2))
}

// ============================================================
// Compatibilidade com o enum antigo (EstadoLivro, 4 valores) —
// a coluna "estado" continua NOT NULL no banco por compatibilidade
// com código legado. Fica aqui (fonte única) pra não duplicar essa
// regra em cada formulário que precisa dela (vender, editar).
// ============================================================
export function estadoLegadoPorNota(nota: number): EstadoLivro {
  if (nota >= 8) return 'OTIMO'
  if (nota >= 6) return 'BOM'
  if (nota >= 4) return 'REGULAR'
  return 'RUIM'
}
