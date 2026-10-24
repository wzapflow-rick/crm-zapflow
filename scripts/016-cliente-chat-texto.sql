BEGIN;

ALTER TABLE public.cliente_chat
  ADD COLUMN IF NOT EXISTS texto text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cliente_chat' AND column_name = 'mensagem'
  ) THEN
    EXECUTE 'UPDATE public.cliente_chat SET texto = mensagem::text WHERE texto IS NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cliente_chat' AND column_name = 'conteudo'
  ) THEN
    EXECUTE 'UPDATE public.cliente_chat SET texto = conteudo::text WHERE texto IS NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cliente_chat' AND column_name = 'message'
  ) THEN
    EXECUTE 'UPDATE public.cliente_chat SET texto = message::text WHERE texto IS NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cliente_chat' AND column_name = 'content'
  ) THEN
    EXECUTE 'UPDATE public.cliente_chat SET texto = content::text WHERE texto IS NULL';
  END IF;
END
$$;

UPDATE public.cliente_chat
SET texto = ''
WHERE texto IS NULL;

ALTER TABLE public.cliente_chat
  ALTER COLUMN texto SET NOT NULL;

ANALYZE public.cliente_chat;

COMMIT;
