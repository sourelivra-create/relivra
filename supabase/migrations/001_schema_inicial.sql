-- ============================================================
-- RELIVRA – Migration 001: Schema Inicial
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  avatar_url  TEXT,
  saldo       NUMERIC(10, 2) DEFAULT 0,
  rating      NUMERIC(3, 1) DEFAULT 5.0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: criar profile automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- BOOKS
-- ============================================================
CREATE TYPE estado_livro AS ENUM ('OTIMO', 'BOM', 'REGULAR', 'RUIM');
CREATE TYPE categoria_livro AS ENUM (
  'LITERATURA', 'FICCAO', 'BIOGRAFIA', 'NEGOCIOS',
  'TECNOLOGIA', 'CIENCIA', 'FILOSOFIA', 'HISTORIA',
  'INFANTIL', 'DIDATICO', 'OUTROS'
);

CREATE TABLE books (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo          TEXT NOT NULL,
  autor           TEXT NOT NULL,
  descricao       TEXT,
  categoria       categoria_livro DEFAULT 'OUTROS',
  estado          estado_livro NOT NULL,
  nota_estado     NUMERIC(3, 1) CHECK (nota_estado >= 0 AND nota_estado <= 10),
  preco           NUMERIC(10, 2) NOT NULL,
  preco_sugerido  NUMERIC(10, 2),
  aceita_troca    BOOLEAN DEFAULT TRUE,
  imagem_url      TEXT,
  vendedor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendido         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries frequentes
CREATE INDEX idx_books_vendedor ON books(vendedor_id);
CREATE INDEX idx_books_vendido ON books(vendido);
CREATE INDEX idx_books_aceita_troca ON books(aceita_troca);
CREATE INDEX idx_books_estado ON books(estado);
CREATE INDEX idx_books_categoria ON books(categoria);
CREATE INDEX idx_books_created_at ON books(created_at DESC);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TYPE tipo_order AS ENUM ('COMPRA', 'TROCA');
CREATE TYPE status_order AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO', 'ENTREGUE');

CREATE TABLE orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comprador_id UUID NOT NULL REFERENCES profiles(id),
  valor_total  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status       status_order DEFAULT 'PENDENTE',
  tipo         tipo_order NOT NULL,
  mp_preference_id TEXT,  -- ID preferência Mercado Pago
  mp_payment_id    TEXT,  -- ID pagamento Mercado Pago
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_comprador ON orders(comprador_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ============================================================
-- ORDER_ITEMS
-- ============================================================
CREATE TABLE order_items (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id  UUID NOT NULL REFERENCES books(id),
  preco    NUMERIC(10, 2) NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- TROCAS
-- ============================================================
CREATE TYPE status_troca AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'FINALIZADA', 'CANCELADA');

CREATE TABLE trocas (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitante_id         UUID NOT NULL REFERENCES profiles(id),
  receptor_id            UUID NOT NULL REFERENCES profiles(id),
  status                 status_troca DEFAULT 'PENDENTE',
  valor_total_solicitante NUMERIC(10, 2) DEFAULT 0,
  valor_total_receptor    NUMERIC(10, 2) DEFAULT 0,
  diferenca_valor        NUMERIC(10, 2) GENERATED ALWAYS AS 
    (ABS(valor_total_solicitante - valor_total_receptor)) STORED,
  order_id               UUID REFERENCES orders(id),  -- criado ao aceitar
  mensagem               TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trocas_solicitante ON trocas(solicitante_id);
CREATE INDEX idx_trocas_receptor ON trocas(receptor_id);
CREATE INDEX idx_trocas_status ON trocas(status);

-- ============================================================
-- TROCA_ITENS
-- ============================================================
CREATE TABLE troca_itens (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  troca_id UUID NOT NULL REFERENCES trocas(id) ON DELETE CASCADE,
  book_id  UUID NOT NULL REFERENCES books(id),
  dono_id  UUID NOT NULL REFERENCES profiles(id)
);

CREATE INDEX idx_troca_itens_troca ON troca_itens(troca_id);

-- ============================================================
-- TRANSACTIONS (Histórico financeiro)
-- ============================================================
CREATE TYPE status_transaction AS ENUM ('PENDENTE', 'PAGO', 'ESTORNADO');
CREATE TYPE tipo_transaction AS ENUM ('VENDA', 'CREDITO', 'DEBITO', 'TROCA');

CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id),
  order_id    UUID REFERENCES orders(id),
  valor       NUMERIC(10, 2) NOT NULL,
  tipo        tipo_transaction NOT NULL,
  status      status_transaction DEFAULT 'PENDENTE',
  descricao   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_vendedor ON transactions(vendedor_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles públicos para leitura"
  ON profiles FOR SELECT USING (TRUE);

CREATE POLICY "Usuário edita próprio profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- BOOKS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Books públicos para leitura"
  ON books FOR SELECT USING (TRUE);

CREATE POLICY "Autenticado pode inserir book"
  ON books FOR INSERT WITH CHECK (auth.uid() = vendedor_id);

CREATE POLICY "Dono edita próprio book"
  ON books FOR UPDATE USING (auth.uid() = vendedor_id);

CREATE POLICY "Dono deleta próprio book"
  ON books FOR DELETE USING (auth.uid() = vendedor_id);

-- ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprios orders"
  ON orders FOR SELECT USING (auth.uid() = comprador_id);

CREATE POLICY "Autenticado cria order"
  ON orders FOR INSERT WITH CHECK (auth.uid() = comprador_id);

CREATE POLICY "Usuário atualiza próprio order"
  ON orders FOR UPDATE USING (auth.uid() = comprador_id);

-- ORDER_ITEMS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver order_items dos próprios orders"
  ON order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.comprador_id = auth.uid())
  );

CREATE POLICY "Inserir order_items em próprios orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.comprador_id = auth.uid())
  );

-- TROCAS
ALTER TABLE trocas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver trocas próprias"
  ON trocas FOR SELECT
  USING (auth.uid() = solicitante_id OR auth.uid() = receptor_id);

CREATE POLICY "Criar troca"
  ON trocas FOR INSERT WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Atualizar troca (partes envolvidas)"
  ON trocas FOR UPDATE
  USING (auth.uid() = solicitante_id OR auth.uid() = receptor_id);

-- TROCA_ITENS
ALTER TABLE troca_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver itens de trocas próprias"
  ON troca_itens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trocas 
      WHERE trocas.id = troca_itens.troca_id 
      AND (trocas.solicitante_id = auth.uid() OR trocas.receptor_id = auth.uid())
    )
  );

CREATE POLICY "Inserir itens em trocas próprias"
  ON troca_itens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trocas 
      WHERE trocas.id = troca_itens.troca_id 
      AND trocas.solicitante_id = auth.uid()
    )
  );

-- TRANSACTIONS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprias transactions"
  ON transactions FOR SELECT USING (auth.uid() = vendedor_id);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('livros', 'livros', TRUE)
ON CONFLICT DO NOTHING;

CREATE POLICY "Imagens públicas"
  ON storage.objects FOR SELECT USING (bucket_id = 'livros');

CREATE POLICY "Autenticado faz upload"
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'livros' AND auth.role() = 'authenticated');

CREATE POLICY "Dono deleta imagem"
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'livros' AND auth.uid()::text = (storage.foldername(name))[1]);
