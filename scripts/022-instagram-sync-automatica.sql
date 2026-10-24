-- Fase 1a: sincronização automática do Instagram.
-- Só adiciona colunas e um índice (todos opcionais); o código atual continua funcionando.
begin;

alter table public.instagram_conexao add column if not exists ultima_tentativa   timestamptz;
alter table public.instagram_conexao add column if not exists sync_bloqueada_ate timestamptz;
alter table public.instagram_conexao add column if not exists sync_token         uuid;
alter table public.instagram_conexao add column if not exists erro_codigo        text;
alter table public.instagram_conexao add column if not exists erro_temporario    boolean not null default false;

alter table public.instagram_midia add column if not exists metricas_atualizadas_em timestamptz;
alter table public.instagram_midia add column if not exists metricas_status         text;
-- 'ok' | 'parcial' | 'indisponivel' | 'erro' | null (pendente)

create index if not exists idx_instagram_midia_empresa_metricas_atualizadas
  on public.instagram_midia (empresa_id, metricas_atualizadas_em asc nulls first);

commit;
