create table if not exists public.cliente_resposta_feedback (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  empresa_id text not null,
  resposta_hash text not null,
  resposta text not null,
  pergunta text,
  avaliacao text not null check (avaliacao in ('util', 'generica', 'aplicada', 'ajustada', 'descartada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, resposta_hash)
);

create index if not exists cliente_resposta_feedback_empresa_idx
  on public.cliente_resposta_feedback (empresa_id, criado_em desc);

comment on table public.cliente_resposta_feedback is
  'Feedback humano por resposta da IA no chat estratégico (útil, genérica, aplicada, ajustada, descartada). Uma avaliação por resposta e cliente.';
