-- Busca semântica do acervo por cliente.
-- Rode no PostgreSQL da SIMPLE OS pelo PgAdmin.
-- A aplicação possui fallback e não quebra se este SQL ainda não tiver sido executado.

create extension if not exists vector;

create table if not exists public.cliente_conteudo_embedding (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  empresa_id text not null,
  origem text not null check (origem in ('instagram', 'simple')),
  origem_id text not null,
  conteudo_hash text not null,
  texto text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, origem, origem_id)
);

create index if not exists cliente_conteudo_embedding_empresa_idx
  on public.cliente_conteudo_embedding (empresa_id, origem);

create index if not exists cliente_conteudo_embedding_vector_idx
  on public.cliente_conteudo_embedding using hnsw (embedding vector_cosine_ops);

comment on table public.cliente_conteudo_embedding is
  'Embeddings do acervo do cliente para recuperação semântica isolada por empresa_id.';

comment on column public.cliente_conteudo_embedding.embedding is
  'Vetor de 1536 dimensões gerado por openai/text-embedding-3-small via Vercel AI Gateway.';
