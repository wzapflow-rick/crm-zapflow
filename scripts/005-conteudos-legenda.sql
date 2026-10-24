-- Adiciona a sugestão de legenda ao pipeline de conteúdo (aba Conteúdo > Roteiro).
-- Rode no Postgres da VPS (pgAdmin). Idempotente.
ALTER TABLE public.conteudos
  ADD COLUMN IF NOT EXISTS legenda text;
