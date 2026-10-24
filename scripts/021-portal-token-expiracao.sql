-- 021 · Validade dos links do portal do cliente
-- Rodar no banco "crm" (pgAdmin > Query Tool). Pode rodar mais de uma vez.

begin;

alter table public.empresas
  add column if not exists portal_token_expira_em timestamptz;

comment on column public.empresas.portal_token_expira_em is
  'Validade do link do portal. NULL = sem expiração. Depois da data, o link deixa de abrir.';

create index if not exists idx_empresas_portal_token_expira_em
  on public.empresas (portal_token_expira_em)
  where portal_token is not null;

commit;

-- Conferência: deve listar a coluna nova
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'empresas'
  and column_name = 'portal_token_expira_em';
