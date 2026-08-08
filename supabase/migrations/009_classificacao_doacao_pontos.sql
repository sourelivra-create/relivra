-- ============================================================
-- RELIVRA – Migration 009: Classificação 1-10, Doação e Pontos
-- ============================================================
-- Implementa:
-- 1. Nova escala de classificação do livro (1-10, com nomes)
-- 2. Campo "destino" calculado automaticamente: VENDA ou DOACAO
-- 3. Saldo de pontos do vendedor (moeda separada de R$, só troca
--    por livros dentro da plataforma)
-- 4. Histórico de pontos ganhos (auditoria, mesmo princípio do
--    ledger financeiro — nunca editado, só novas entradas)
-- 5. Solicitações de doação (reserva 1 livro por solicitação)
-- ============================================================

-- ============================================================
-- 1. Nova escala de classificação (1-10)
-- ============================================================
CREATE TYPE classificacao_livro AS ENUM (
  'EXCELENTE',   -- 10
  'NOVO',        -- 9
  'OTIMO',       -- 8
  'MUITO_BOM',   -- 7
  'BOM',         -- 6
  'REGULAR',     -- 5
  'RUIM',        -- 4
  'MUITO_RUIM',  -- 3
  'PESSIMO',     -- 2
  'INUTILIZAVEL' -- 1
);

CREATE TYPE destino_livro AS ENUM ('VENDA', 'DOACAO');

-- Novos campos em books — mantemos "estado" (enum antigo) intacto
-- por compatibilidade, e adicionamos os novos ao lado. nota_estado
-- (já existente, 0-10) passa a ser a referência oficial.
ALTER TABLE books ADD COLUMN classificacao classificacao_livro;
ALTER TABLE books ADD COLUMN destino destino_livro NOT NULL DEFAULT 'VENDA';

UPDATE books SET classificacao = (CASE
  WHEN nota_estado >= 9.5 THEN 'EXCELENTE'
  WHEN nota_estado >= 8.5 THEN 'NOVO'
  WHEN nota_estado >= 7.5 THEN 'OTIMO'
  WHEN nota_estado >= 6.5 THEN 'MUITO_BOM'
  WHEN nota_estado >= 5.5 THEN 'BOM'
  WHEN nota_estado >= 4.5 THEN 'REGULAR'
  WHEN nota_estado >= 3.5 THEN 'RUIM'
  WHEN nota_estado >= 2.5 THEN 'MUITO_RUIM'
  WHEN nota_estado >= 1.5 THEN 'PESSIMO'
  ELSE 'INUTILIZAVEL'
END)::classificacao_livro
WHERE nota_estado IS NOT NULL;

UPDATE books SET classificacao = 'BOM'::classificacao_livro WHERE classificacao IS NULL;
ALTER TABLE books ALTER COLUMN classificacao SET NOT NULL;

-- Destino é calculado automaticamente a partir da nota — trigger
-- garante que nunca fica fora de sincronia, mesmo se o vendedor
-- editar a nota depois de publicar
CREATE OR REPLACE FUNCTION calcular_destino_livro()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nota_estado IS NOT NULL AND NEW.nota_estado < 4.5 THEN
    NEW.destino := 'DOACAO';
  ELSE
    NEW.destino := 'VENDA';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_destino
  BEFORE INSERT OR UPDATE OF nota_estado ON books
  FOR EACH ROW EXECUTE FUNCTION calcular_destino_livro();

-- Atualiza o destino de todos os livros já existentes, agora que
-- o trigger existe (precisa de um UPDATE para disparar)
UPDATE books SET nota_estado = nota_estado WHERE nota_estado IS NOT NULL;

CREATE INDEX idx_books_destino ON books(destino);

-- ============================================================
-- 2. Saldo de pontos do vendedor — moeda separada de R$, nunca
--    convertida em dinheiro, só serve para trocar por livros
-- ============================================================
ALTER TABLE profiles ADD COLUMN saldo_pontos NUMERIC(10, 2) NOT NULL DEFAULT 0;

CREATE TABLE pontos_historico (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendedor_id     UUID NOT NULL REFERENCES profiles(id),
  order_id        UUID REFERENCES orders(id),
  book_id         UUID REFERENCES books(id),
  valor_venda     NUMERIC(10, 2) NOT NULL,
  bonus_qualidade NUMERIC(4, 2) NOT NULL DEFAULT 0,
  pontos_ganhos   NUMERIC(10, 2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pontos_historico_vendedor ON pontos_historico(vendedor_id);

ALTER TABLE pontos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedor vê próprio histórico de pontos"
  ON pontos_historico FOR SELECT
  USING (auth.uid() = vendedor_id);

-- ============================================================
-- 3. Solicitações de doação — reserva 1 livro por solicitação
-- ============================================================
CREATE TYPE status_solicitacao_doacao AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'CONCLUIDA', 'CANCELADA');

CREATE TABLE solicitacoes_doacao (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id        UUID NOT NULL REFERENCES books(id),
  solicitante_id UUID NOT NULL REFERENCES profiles(id),
  status         status_solicitacao_doacao NOT NULL DEFAULT 'PENDENTE',
  mensagem       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),

  -- Garante que o mesmo livro não pode ter duas solicitações
  -- simultâneas — reserva exclusiva no nível do banco
  UNIQUE (book_id)
);

CREATE INDEX idx_solicitacoes_doacao_solicitante ON solicitacoes_doacao(solicitante_id);
CREATE INDEX idx_solicitacoes_doacao_status ON solicitacoes_doacao(status);

ALTER TABLE solicitacoes_doacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solicitante vê própria solicitação"
  ON solicitacoes_doacao FOR SELECT
  USING (auth.uid() = solicitante_id);

CREATE POLICY "Dono do livro vê solicitações do seu livro"
  ON solicitacoes_doacao FOR SELECT
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = solicitacoes_doacao.book_id AND books.vendedor_id = auth.uid()));

CREATE POLICY "Autenticado pode solicitar doação"
  ON solicitacoes_doacao FOR INSERT
  WITH CHECK (auth.uid() = solicitante_id);
