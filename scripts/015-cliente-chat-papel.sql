BEGIN;

ALTER TABLE public.cliente_chat
  ADD COLUMN IF NOT EXISTS papel text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cliente_chat' AND column_name = 'role'
  ) THEN
    EXECUTE 'UPDATE public.cliente_chat SET papel = role::text WHERE papel IS NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cliente_chat' AND column_name = 'remetente'
  ) THEN
    EXECUTE 'UPDATE public.cliente_chat SET papel = remetente::text WHERE papel IS NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cliente_chat' AND column_name = 'tipo'
  ) THEN
    EXECUTE 'UPDATE public.cliente_chat SET papel = tipo::text WHERE papel IS NULL';
  END IF;
END
$$;

UPDATE public.cliente_chat
SET papel = CASE
  WHEN lower(trim(coalesce(papel, ''))) IN ('assistant', 'assistente', 'ia', 'bot', 'simple')
    THEN 'assistant'
  ELSE 'user'
END;

ALTER TABLE public.cliente_chat
  ALTER COLUMN papel SET DEFAULT 'user',
  ALTER COLUMN papel SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.cliente_chat'::regclass
      AND conname = 'cliente_chat_papel_check'
  ) THEN
    ALTER TABLE public.cliente_chat
      ADD CONSTRAINT cliente_chat_papel_check
      CHECK (papel IN ('user', 'assistant'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_cliente_chat_empresa_created
  ON public.cliente_chat (empresa_id, created_at ASC);

ANALYZE public.cliente_chat;

COMMIT;
