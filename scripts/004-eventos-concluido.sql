-- Permite marcar compromissos do calendário como concluídos no checklist de Tarefas.
ALTER TABLE public.agenda_compromissos
  ADD COLUMN IF NOT EXISTS concluido boolean NOT NULL DEFAULT false;
