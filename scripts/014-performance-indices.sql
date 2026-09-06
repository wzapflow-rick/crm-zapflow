-- Índices para as consultas mais frequentes do dashboard e do detalhe do cliente.
-- Todos são idempotentes e podem ser aplicados sem alterar dados.

create index if not exists idx_empresas_created_at_nome
  on public.empresas (created_at desc, nome asc);

create index if not exists idx_empresas_ativos_recorrentes_nome
  on public.empresas (nome asc)
  where status = 'ativo' and recorrente is distinct from false;

create index if not exists idx_empresas_portal_token
  on public.empresas (portal_token)
  where portal_token is not null;

create index if not exists idx_tarefas_abertas_prazo_empresa
  on public.tarefas (prazo asc, empresa_id)
  where status <> 'concluido' and prazo is not null;

create index if not exists idx_instagram_midia_empresa_publicado
  on public.instagram_midia (empresa_id, publicado_em desc)
  where publicado_em is not null;

create index if not exists idx_metas_empresa_posicao_created
  on public.metas (empresa_id, posicao asc, created_at asc);

create index if not exists idx_agenda_empresa_data_hora
  on public.agenda_compromissos (empresa_id, data desc, hora desc, created_at desc);

create index if not exists idx_conteudos_empresa_data_posicao
  on public.conteudos (empresa_id, data desc, posicao desc, created_at desc);

create index if not exists idx_comunicacoes_empresa_posicao
  on public.comunicacoes (empresa_id, posicao asc, created_at asc);

create index if not exists idx_comunicacoes_cliente_recentes
  on public.comunicacoes (created_at desc)
  where de_cliente = true;

create index if not exists idx_resultados_empresa_posicao
  on public.resultados (empresa_id, posicao asc, created_at asc);

create index if not exists idx_cliente_reuniao_empresa_data
  on public.cliente_reuniao (empresa_id, data_reuniao desc, created_at desc);

create index if not exists idx_cliente_performance_empresa_data
  on public.cliente_conteudo_performance (empresa_id, data desc, created_at desc);
