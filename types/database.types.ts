// ============================================================
// RELIVRA – Database Types (gerado do schema Supabase)
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type EstadoLivro = 'OTIMO' | 'BOM' | 'REGULAR' | 'RUIM'
export type TipoOrder = 'COMPRA' | 'TROCA'
export type StatusOrder = 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'ENTREGUE'
export type StatusTroca = 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'FINALIZADA' | 'CANCELADA'
export type StatusTransaction = 'PENDENTE' | 'PAGO' | 'ESTORNADO'
export type TipoTransaction = 'VENDA' | 'CREDITO' | 'DEBITO' | 'TROCA'

// Categorias agora são dinâmicas — a IA pode criar novas conforme
// identifica livros que não se encaixam nas existentes.
export interface Categoria {
  id: string
  nome: string
  slug: string
  criada_por_ia: boolean
  created_at: string
}

export interface Profile {
  id: string
  nome: string
  avatar_url: string | null
  saldo: number
  rating: number
  created_at: string
}

export type StatusAvaliacaoIA = 'NAO_SOLICITADA' | 'PROCESSANDO' | 'CONCLUIDA' | 'ERRO'

export interface Book {
  id: string
  titulo: string
  autor: string
  descricao: string | null
  categoria_id: string
  versao: string | null             // ex: "2ª edição, 2020"
  estado: EstadoLivro                // declarado pelo VENDEDOR (manual)
  nota_estado: number | null         // nota do VENDEDOR (manual)
  preco: number
  preco_sugerido: number | null
  aceita_troca: boolean
  imagem_url: string | null          // DEPRECATED — mantido só para dados antigos
  fotos: string[]                    // mínimo 3: [capa, interna, verso, ...extras]
  vendedor_id: string
  vendido: boolean
  created_at: string
  // Avaliação independente da IA — segunda opinião, não sobrescreve
  // a escolha do vendedor, só é exibida ao lado para o comprador
  status_avaliacao_ia: StatusAvaliacaoIA
  estado_ia: EstadoLivro | null
  nota_ia: number | null
  descricao_estado_ia: string | null
  tentativas_avaliacao_ia: number
  avaliacao_ia_solicitada_em: string | null
  avaliacao_ia_concluida_em: string | null
  // Join
  vendedor?: Profile
  categoria?: Categoria
}

export interface Order {
  id: string
  comprador_id: string
  valor_total: number
  status: StatusOrder
  tipo: TipoOrder
  mp_preference_id: string | null
  mp_payment_id: string | null
  created_at: string
  // Join
  comprador?: Profile
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  book_id: string
  preco: number
  // Join
  book?: Book
}

export interface Troca {
  id: string
  solicitante_id: string
  receptor_id: string
  status: StatusTroca
  valor_total_solicitante: number
  valor_total_receptor: number
  diferenca_valor: number
  order_id: string | null
  mensagem: string | null
  created_at: string
  updated_at: string
  // Join
  solicitante?: Profile
  receptor?: Profile
  itens?: TrocaItem[]
}

export interface TrocaItem {
  id: string
  troca_id: string
  book_id: string
  dono_id: string
  // Join
  book?: Book
  dono?: Profile
}

export interface Transaction {
  id: string
  vendedor_id: string
  order_id: string | null
  valor: number
  tipo: TipoTransaction
  status: StatusTransaction
  descricao: string | null
  created_at: string
}

// ============================================================
// IA Types
// ============================================================
export interface AnaliseIA {
  titulo: string
  autor: string
  categoria_sugerida: string
  estado: EstadoLivro
  nota: number
  descricao_estado: string
  incerto: boolean
}

// ============================================================
// Filtros da Home
// ============================================================
export interface FiltrosLivro {
  categoria_id?: string
  estado?: EstadoLivro
  preco_min?: number
  preco_max?: number
  aceita_troca?: boolean
  busca?: string
}

// ============================================================
// Mercado Pago
// ============================================================
export interface MPPreferencia {
  preference_id: string
  init_point: string
}

// ============================================================
// Database schema tipo completo (para Supabase client)
// ============================================================
// Nota: usamos um tipo simplificado aqui (em vez de gerar via
// `supabase gen types typescript`) para evitar que o TypeScript
// infira "never" em queries com joins ou campos opcionais.
// Os tipos de domínio (Book, Profile, etc.) acima continuam
// sendo usados manualmente para tipar os resultados nos componentes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
