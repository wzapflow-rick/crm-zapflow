-- Direcionamento interno do conteúdo (visível apenas para a equipe, nunca no portal do cliente).
-- Orientações de filmagem para videomakers e de aparência visual para o design gráfico.
alter table public.conteudos
  add column if not exists direcionamento text;
