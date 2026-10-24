create table if not exists public.cliente_resposta_ia_avaliacao (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  empresa_id text not null,
  pergunta text not null,
  resposta_inicial text not null,
  resposta_final text not null,
  avaliacao_inicial jsonb not null default '{}'::jsonb,
  avaliacao_final jsonb,
  verificacoes_deterministicas jsonb not null default '{}'::jsonb,
  fontes jsonb not null default '[]'::jsonb,
  problemas jsonb not null default '[]'::jsonb,
  correcao_aplicada boolean not null default false,
  resposta_conservadora boolean not null default false,
  modelo_geracao text not null,
  modelo_avaliacao text not null,
  criado_em timestamptz not null default now()
);

create index if not exists cliente_resposta_ia_avaliacao_empresa_idx
  on public.cliente_resposta_ia_avaliacao (empresa_id, criado_em desc);

comment on table public.cliente_resposta_ia_avaliacao is
  'Auditoria interna das respostas estratégicas da IA, incluindo avaliação, correções e evidências por cliente.';
