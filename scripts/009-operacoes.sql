-- Migração: Operações da SIMPLE (testes/experimentos da agência como um todo).
-- A ideia do SIMPLE OS: cada operação vira DADO REAL (não achismo) e alimenta
-- as recomendações de conteúdo da IA. Ex.: "Operação Gancho" descobre qual tipo
-- de abertura retém mais e isso passa a orientar roteiros de todos os clientes.
-- Rode este SQL no Postgres da VPS antes de usar a aba "Operações" do Marketing.
-- É idempotente: pode rodar mais de uma vez sem erro.

create table if not exists public.operacao (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  objetivo       text,
  status         text not null default 'em_andamento', -- 'planejamento' | 'em_andamento' | 'concluida'
  metodologia    text,                                  -- como o teste foi/está sendo feito
  vencedor       text,                                  -- qual variação venceu e por quê (vazio se sem resultado)
  resumo         text,                                  -- síntese da IA sobre a operação
  dados_brutos   text,                                  -- tudo que a equipe colou (fonte original)
  variacoes      jsonb not null default '[]'::jsonb,    -- variações testadas
  metricas       jsonb not null default '[]'::jsonb,    -- métricas analisadas
  aprendizados   jsonb not null default '[]'::jsonb,    -- aprendizados acionáveis
  recomendacoes  jsonb not null default '[]'::jsonb,    -- recomendações para conteúdo futuro
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists operacao_status_idx on public.operacao (status, created_at desc);
