-- Migração: conexão com Instagram (Instagram API with Instagram Login) e mídias sincronizadas.
-- Rode este SQL no Postgres da VPS antes de usar a aba "Instagram" do cliente.
-- É idempotente: pode rodar mais de uma vez sem erro.

-- Uma linha por cliente (empresa). Guarda o vínculo da conta e o token (criptografado no modo real).
create table if not exists public.instagram_conexao (
  empresa_id           text primary key,
  modo                 text not null default 'real',      -- 'real' (Meta) | 'demo' (dados de exemplo)
  ig_user_id           text,
  username             text,
  nome                 text,
  account_type         text,
  profile_picture_url  text,
  seguidores           integer,
  segue                integer,
  midia_count          integer,
  access_token         text,                              -- AES-256-GCM (modo real); NULL no demo
  token_expira_em      timestamptz,
  status               text not null default 'conectado', -- 'conectado' | 'expirado' | 'erro'
  ultimo_erro          text,
  conectado_em         timestamptz not null default now(),
  ultima_sync          timestamptz
);

-- Mídias (posts/reels) sincronizadas da conta, com insights por publicação.
create table if not exists public.instagram_midia (
  id                text primary key,        -- id da mídia no Instagram (ou 'demo-...' no modo demo)
  empresa_id        text not null,
  tipo              text,                     -- IMAGE | VIDEO | CAROUSEL_ALBUM | REELS
  legenda           text,
  permalink         text,
  thumbnail_url     text,
  media_url         text,
  publicado_em      timestamptz,
  curtidas          integer,
  comentarios       integer,
  alcance           integer,
  impressoes        integer,
  salvamentos       integer,
  compartilhamentos integer,
  visualizacoes     integer,                  -- views de vídeo/reels
  atualizado_em     timestamptz not null default now()
);

create index if not exists instagram_midia_empresa_idx
  on public.instagram_midia (empresa_id, publicado_em desc nulls last);
