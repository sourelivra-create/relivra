-- ============================================================
-- RELIVRA – Migration 010: Doação com histórico + sync classificação
-- ============================================================
-- Resolve duas lacunas encontradas na auditoria:
-- 1. solicitacoes_doacao usava UNIQUE(book_id) simples — travava o
--    livro pra sempre após uma recusa. Trocamos por índice único
--    PARCIAL (só bloqueia enquanto a solicitação estiver ativa),
--    preservando histórico em vez de deletar linhas.
-- 2. classificacao não tinha trigger de auto-sincronização a partir
--    de nota_estado (só destino tinha) — deixa a integridade do
--    dado inteiramente nas mãos do código da aplicação.
-- ============================================================

-- ============================================================
-- 1. Solicitações de doação — histórico preservado
-- ============================================================

-- Remove a constraint UNIQUE simples antiga
ALTER TABLE solicitacoes_doacao DROP CONSTRAINT IF EXISTS solicitacoes_doacao_book_id_key;

-- Índice único parcial: só impede solicitação nova enquanto já
-- existir uma PENDENTE ou ACEITA para o mesmo livro. Depois de
-- RECUSADA/CANCELADA/CONCLUIDA, o livro libera para nova solicitação
-- sem precisar apagar a linha antiga.
CREATE UNIQUE INDEX idx_solicitacao_doacao_ativa
  ON solicitacoes_doacao (book_id)
  WHERE status IN ('PENDENTE', 'ACEITA');

-- Policy de UPDATE que faltava — sem ela, ninguém consegue mudar o
-- status pelo client Supabase (só client com service_role).
-- Dono do livro pode aceitar/recusar solicitações do seu livro.
CREATE POLICY "Dono do livro responde solicitação"
  ON solicitacoes_doacao FOR UPDATE
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = solicitacoes_doacao.book_id AND books.vendedor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM books WHERE books.id = solicitacoes_doacao.book_id AND books.vendedor_id = auth.uid()));

-- Solicitante pode cancelar a própria solicitação
CREATE POLICY "Solicitante cancela própria solicitação"
  ON solicitacoes_doacao FOR UPDATE
  USING (auth.uid() = solicitante_id)
  WITH CHECK (auth.uid() = solicitante_id);

-- ============================================================
-- 2. Trigger de auto-sincronização de classificacao a partir de
--    nota_estado — mesma lógica de calcular_destino_livro, para
--    que classificacao nunca fique dessincronizada de nota_estado,
--    mesmo se o código da aplicação esquecer de setá-la.
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_classificacao_livro()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nota_estado IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.classificacao := (CASE
    WHEN NEW.nota_estado >= 9.5 THEN 'EXCELENTE'
    WHEN NEW.nota_estado >= 8.5 THEN 'NOVO'
    WHEN NEW.nota_estado >= 7.5 THEN 'OTIMO'
    WHEN NEW.nota_estado >= 6.5 THEN 'MUITO_BOM'
    WHEN NEW.nota_estado >= 5.5 THEN 'BOM'
    WHEN NEW.nota_estado >= 4.5 THEN 'REGULAR'
    WHEN NEW.nota_estado >= 3.5 THEN 'RUIM'
    WHEN NEW.nota_estado >= 2.5 THEN 'MUITO_RUIM'
    WHEN NEW.nota_estado >= 1.5 THEN 'PESSIMO'
    ELSE 'INUTILIZAVEL'
  END)::classificacao_livro;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_classificacao
  BEFORE INSERT OR UPDATE OF nota_estado ON books
  FOR EACH ROW EXECUTE FUNCTION calcular_classificacao_livro();

-- Nota: a partir de agora, o código da aplicação PODE continuar
-- mandando classificacao explicitamente no insert (não tem problema,
-- o trigger roda BEFORE e sobrescreve com o valor derivado de
-- nota_estado de qualquer forma) — mas não é mais obrigatório.
