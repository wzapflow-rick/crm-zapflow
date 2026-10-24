-- Índices para acelerar montarContextoCliente() (aba Evolução, chat estratégico,
-- análise automática). Estas tabelas eram consultadas por empresa_id SEM índice,
-- causando varredura completa e "Query read timeout" (10s) em clientes com muitos
-- registros. Todos são idempotentes e NÃO alteram dados.

-- Análises versionadas da IA (getHistoricoAnalisesIa) — principal gargalo.
create index if not exists idx_cliente_analise_ia_empresa_data
  on public.cliente_analise_ia (empresa_id, analisado_em desc);

-- Linha do tempo de evolução (getHistorico).
create index if not exists idx_cliente_historico_empresa_created
  on public.cliente_historico (empresa_id, created_at desc);

-- Experimentos (getExperimentos).
create index if not exists idx_cliente_experimento_empresa_created
  on public.cliente_experimento (empresa_id, created_at desc);

-- Padrões aprendidos (getPadroes).
create index if not exists idx_cliente_padrao_empresa_created
  on public.cliente_padrao (empresa_id, created_at desc);

-- Memória do cliente (getMemoria).
create index if not exists idx_cliente_memoria_empresa
  on public.cliente_memoria (empresa_id);
