-- ============================================================
-- RELIVRA – Migration 012: Chat comprador/vendedor
-- ============================================================
-- Um "entrar em contato" simples: qualquer usuário logado pode
-- abrir conversa com o dono de um livro (venda, troca ou doação —
-- sem distinção de tipo). Sem tempo real por enquanto (fica pra
-- depois, é infraestrutura separada) — inbox recarrega ao entrar.
-- ============================================================

CREATE TABLE conversas (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id             uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  comprador_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendedor_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  ultima_mensagem_em  timestamptz NOT NULL DEFAULT now(),

  -- Clicar de novo em "entrar em contato" no mesmo livro reabre a
  -- MESMA conversa, não cria uma nova toda vez
  UNIQUE (book_id, comprador_id),
  CHECK (comprador_id <> vendedor_id)
);

CREATE INDEX idx_conversas_comprador ON conversas(comprador_id);
CREATE INDEX idx_conversas_vendedor ON conversas(vendedor_id);
CREATE INDEX idx_conversas_ultima_mensagem ON conversas(ultima_mensagem_em DESC);

CREATE TABLE mensagens (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id   uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  remetente_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  texto         text NOT NULL CHECK (char_length(trim(texto)) > 0 AND char_length(texto) <= 2000),
  created_at    timestamptz NOT NULL DEFAULT now(),
  lida_em       timestamptz
);

CREATE INDEX idx_mensagens_conversa ON mensagens(conversa_id, created_at);

-- ============================================================
-- RLS — só os dois participantes da conversa enxergam ela ou
-- qualquer mensagem dela. Ninguém mais, nem outro usuário logado.
-- ============================================================

ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes veem a conversa"
  ON conversas FOR SELECT
  USING (auth.uid() = comprador_id OR auth.uid() = vendedor_id);

CREATE POLICY "Comprador inicia conversa"
  ON conversas FOR INSERT
  WITH CHECK (auth.uid() = comprador_id);

-- Necessário pro upsert (get-or-create) funcionar, e pro trigger
-- de "última mensagem" (abaixo) conseguir atualizar o timestamp
CREATE POLICY "Participantes atualizam conversa"
  ON conversas FOR UPDATE
  USING (auth.uid() = comprador_id OR auth.uid() = vendedor_id);

CREATE POLICY "Participantes veem mensagens"
  ON mensagens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversas
      WHERE conversas.id = mensagens.conversa_id
        AND (conversas.comprador_id = auth.uid() OR conversas.vendedor_id = auth.uid())
    )
  );

CREATE POLICY "Participante envia mensagem"
  ON mensagens FOR INSERT
  WITH CHECK (
    auth.uid() = remetente_id
    AND EXISTS (
      SELECT 1 FROM conversas
      WHERE conversas.id = mensagens.conversa_id
        AND (conversas.comprador_id = auth.uid() OR conversas.vendedor_id = auth.uid())
    )
  );

-- Marcar como lida (o destinatário marca a mensagem do outro como lida)
CREATE POLICY "Participante marca mensagem como lida"
  ON mensagens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversas
      WHERE conversas.id = mensagens.conversa_id
        AND (conversas.comprador_id = auth.uid() OR conversas.vendedor_id = auth.uid())
    )
  );

-- ============================================================
-- Trigger: toda mensagem nova atualiza ultima_mensagem_em da
-- conversa, pra inbox conseguir ordenar por "mais recente" sem o
-- código da aplicação ter que lembrar de fazer os dois inserts
-- ============================================================

CREATE OR REPLACE FUNCTION atualizar_ultima_mensagem_conversa()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversas SET ultima_mensagem_em = NEW.created_at WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_ultima_mensagem
  AFTER INSERT ON mensagens
  FOR EACH ROW EXECUTE FUNCTION atualizar_ultima_mensagem_conversa();
