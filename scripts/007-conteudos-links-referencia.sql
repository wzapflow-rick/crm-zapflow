-- Item extra: unificar "conteúdos" e "materiais".
-- Cada conteúdo passa a ter uma lista de links do drive (rótulo + url)
-- e um link de referência opcional. Idempotente.

ALTER TABLE public.conteudos
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.conteudos
  ADD COLUMN IF NOT EXISTS referencia text;
