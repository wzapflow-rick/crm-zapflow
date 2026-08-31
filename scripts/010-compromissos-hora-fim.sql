-- Rode no banco do CRM (o mesmo usado pela aplicação / DATABASE_URL).
-- Fase: hora final dos compromissos (para calcular a duração de cada tarefa/agenda)
-- Adiciona a coluna hora_fim em agenda_compromissos. Idempotente e não destrutivo.

ALTER TABLE public.agenda_compromissos
  ADD COLUMN IF NOT EXISTS hora_fim time;

-- Verificação: deve listar a coluna hora_fim como "time without time zone".
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'agenda_compromissos'
  AND column_name = 'hora_fim';
