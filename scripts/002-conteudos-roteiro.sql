-- Adiciona o roteiro ao pipeline de conteúdo (aba Conteúdo do cliente).
-- Rode no Postgres da VPS (pgAdmin). Idempotente.
ALTER TABLE public.conteudos
  ADD COLUMN IF NOT EXISTS roteiro text;
