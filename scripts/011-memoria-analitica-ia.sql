-- Memória analítica versionada por cliente.
-- Rode este SQL no PostgreSQL da SIMPLE OS pelo PgAdmin antes de usar o histórico da IA.
-- É idempotente e não altera tabelas existentes.

create table if not exists public.cliente_analise_ia (
  id                  text primary key default md5(random()::text || clock_timestamp()::text),
  empresa_id          text not null,
  analisado_em        timestamptz not null default now(),
  periodo_inicio      date,
  periodo_fim         date,
  posts_instagram     integer not null default 0,
  conteudos_simple    integer not null default 0,
  resumo              jsonb not null default '{}'::jsonb,
  metricas            jsonb not null default '{}'::jsonb,
  qualidade           jsonb not null default '{}'::jsonb,
  padroes             jsonb not null default '[]'::jsonb,
  criado_em           timestamptz not null default now()
);

create index if not exists cliente_analise_ia_empresa_idx
  on public.cliente_analise_ia (empresa_id, analisado_em desc);

comment on table public.cliente_analise_ia is
  'Histórico versionado das análises da IA por cliente, com evidências, métricas e qualidade dos dados.';
