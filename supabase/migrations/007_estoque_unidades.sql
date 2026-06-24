-- ============================================================
-- RELIVRA – Migration 007: Estoque (Múltiplas Unidades por Anúncio)
-- ============================================================
-- Permite que um único anúncio represente N cópias idênticas do
-- mesmo livro (mesma edição, mesmo estado). Cada venda abate do
-- estoque; o livro só fica "vendido" quando o estoque zera.
-- ============================================================

ALTER TABLE books ADD COLUMN quantidade_total INTEGER NOT NULL DEFAULT 1
  CHECK (quantidade_total >= 1);

ALTER TABLE books ADD COLUMN quantidade_disponivel INTEGER NOT NULL DEFAULT 1
  CHECK (quantidade_disponivel >= 0);

UPDATE books SET
  quantidade_total = 1,
  quantidade_disponivel = CASE WHEN vendido THEN 0 ELSE 1 END;

-- A coluna "vendido" é mantida por compatibilidade com código
-- existente, mas passa a ser sincronizada automaticamente a partir
-- de quantidade_disponivel — nunca editada manualmente em paralelo.

CREATE OR REPLACE FUNCTION sincronizar_vendido_com_estoque()
RETURNS TRIGGER AS $$
BEGIN
  NEW.vendido := (NEW.quantidade_disponivel = 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sincronizar_vendido
  BEFORE INSERT OR UPDATE OF quantidade_disponivel ON books
  FOR EACH ROW EXECUTE FUNCTION sincronizar_vendido_com_estoque();

ALTER TABLE order_items ADD COLUMN quantidade INTEGER NOT NULL DEFAULT 1
  CHECK (quantidade >= 1);
