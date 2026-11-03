-- Observações internas, contrato fixado e status "ajuste" nos conteúdos.
-- Pode rodar mais de uma vez sem efeito colateral.
begin;

-- Observações internas: só a equipe vê. Nunca são enviadas ao portal.
alter table public.empresas add column if not exists observacoes_internas text;

-- Contrato fixado: visível no CRM e no portal do cliente.
alter table public.empresas add column if not exists contrato_url text;
alter table public.empresas add column if not exists contrato_resumo text;
alter table public.empresas add column if not exists contrato_atualizado_em timestamptz;

-- Pedido de ajuste feito pelo cliente no portal.
alter table public.conteudos add column if not exists ajuste_pedido text;
alter table public.conteudos add column if not exists ajuste_pedido_em timestamptz;

-- Se houver uma restrição CHECK limitando os valores de conteudos.status,
-- recria incluindo 'ajuste'. Sem restrição, nada acontece.
do $$
declare
  r record;
begin
  for r in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'conteudos'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.conteudos drop constraint %I', r.conname);
    execute $sql$alter table public.conteudos add constraint conteudos_status_check
      check (status in ('ideia','roteiro','gravacao','edicao','aprovacao','ajuste','aprovado','publicado'))$sql$;
  end loop;
end $$;

create index if not exists idx_conteudos_empresa_status on public.conteudos (empresa_id, status);

commit;
