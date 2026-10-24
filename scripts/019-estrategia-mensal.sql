-- Estratégia mensal versionada por cliente (Tópico 4).
-- Um registro por cliente e competência (mês/ano). Guarda o plano (objetivo,
-- pilares, campanhas, KPIs planejados, resumo do calendário) e o acompanhamento
-- (KPIs realizados, retrospectiva, status), permitindo comparar planejado x executado.

create table if not exists public.cliente_estrategia_mensal (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  empresa_id text not null,
  competencia text not null, -- formato YYYY-MM
  objetivo text,
  pilares text[] not null default '{}',
  campanhas jsonb not null default '[]'::jsonb,   -- [{ nome, descricao }]
  kpis jsonb not null default '[]'::jsonb,         -- [{ rotulo, alvo, realizado }]
  calendario_resumo text,
  retrospectiva text,
  status text not null default 'planejado' check (status in ('planejado', 'em_andamento', 'concluido')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, competencia)
);

create index if not exists cliente_estrategia_mensal_empresa_idx
  on public.cliente_estrategia_mensal (empresa_id, competencia desc);

comment on table public.cliente_estrategia_mensal is
  'Estratégia mensal versionada por cliente: plano (objetivo, pilares, campanhas, KPIs) e acompanhamento (realizado, retrospectiva) para comparar planejado x executado.';
