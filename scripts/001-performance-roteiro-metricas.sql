-- Migração: campos de roteiro/público e novas métricas de performance de conteúdo
-- Tabela: public.cliente_conteudo_performance
-- Rode este SQL no Postgres da VPS antes de usar o "Novo conteúdo publicado".
-- É idempotente: pode rodar mais de uma vez sem erro.

alter table public.cliente_conteudo_performance
  add column if not exists roteiro        text,
  add column if not exists publico         text,
  add column if not exists visitas_perfil  integer,
  add column if not exists seguidores      integer,
  add column if not exists reposts         integer;
