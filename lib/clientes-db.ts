import "server-only"
import { query, getPool } from "@/lib/db"
import type {
  Arquivo,
  Cliente,
  ConteudoItem,
  Estrategia,
  EventoCliente,
  LinkConteudo,
  Mensagem,
  MetricaResultado,
  Meta,
  StatusCliente,
  StatusConteudo,
} from "@/lib/simple-data"

type EmpresaRow = {
  id: string
  nome: string
  slug: string | null
  segmento: string | null
  status: string | null
  responsavel_id: string | null
  responsaveis_ids: string[] | null
  mrr: string | null
  recorrente: boolean | null
  logo_url: string | null
  banner_url: string | null
  iniciais: string | null
  cor: string | null
  objetivo: string | null
  contato: string | null
  telefone: string | null
  desde: Date | null
  resumo_estrategico?: string | null
  portal_token?: string | null
}

// Paleta de cores de avatar usada quando o cliente não tem cor definida.
const CORES = ["bg-primary", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]

function corPara(nome: string) {
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % CORES.length
  return CORES[h]
}

export function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "??"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export function slugDe(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function formatarDesde(d: Date | null) {
  if (!d) return "—"
  const data = new Date(d)
  return `${MESES[data.getUTCMonth()]} ${data.getUTCFullYear()}`
}

const STATUS_VALIDOS: StatusCliente[] = ["ativo", "onboarding", "pausado"]

function mapRow(r: EmpresaRow): Cliente {
  const nome = r.nome ?? "Sem nome"
  const status = (STATUS_VALIDOS.includes(r.status as StatusCliente) ? r.status : "onboarding") as StatusCliente
  // Compatibilidade: usa o array novo; se vazio, cai para a coluna antiga responsavel_id.
  const responsaveisIds =
    r.responsaveis_ids && r.responsaveis_ids.length > 0
      ? r.responsaveis_ids
      : r.responsavel_id
        ? [r.responsavel_id]
        : []
  return {
    id: r.id,
    nome,
    segmento: r.segmento ?? "—",
    status,
    responsavelId: responsaveisIds[0] ?? "",
    responsaveisIds,
    mrr: r.mrr ? Number(r.mrr) : 0,
    recorrente: r.recorrente !== false, // null/true = recorrente; só false é avulso
    logoUrl: r.logo_url ?? "",
    bannerUrl: r.banner_url ?? "",
    iniciais: r.iniciais || iniciaisDe(nome),
    cor: r.cor || corPara(nome),
    objetivo: r.objetivo ?? "",
    contato: r.contato ?? "",
    telefone: r.telefone ?? "",
    desde: formatarDesde(r.desde),
    desdeISO: r.desde ? new Date(r.desde).toISOString().slice(0, 10) : "",
    resumoEstrategico: r.resumo_estrategico ?? "",
    portalToken: r.portal_token ?? "",
  }
}

export async function getClientes(): Promise<Cliente[]> {
  const rows = await query<EmpresaRow>(
    `select id, nome, slug, segmento, status, responsavel_id, responsaveis_ids, mrr, recorrente, logo_url, iniciais, cor, objetivo, contato, telefone, desde
     from public.empresas
     order by created_at desc nulls last, nome asc`,
  )
  return rows.map(mapRow)
}

// ── Clientes que precisam de atenção (Dashboard) ──────────────────────────
// Radar operacional: detecta, em uma única query agregada, situações de risco
// APENAS de clientes com status 'ativo'. Cada situação vira um alerta com um
// nível de prioridade e uma ação direta ("Ver cliente", "Ver resultados", ...).
//
// A estrutura é modular: novos tipos de alerta (financeiro, CRM, calendário...)
// podem ser adicionados sem mudar o Dashboard — basta empurrar mais itens para
// a lista de `AlertaCliente` seguindo o mesmo formato.
export type PrioridadeAlerta = "critico" | "atencao" | "acompanhar"

export type AlertaCliente = {
  clienteId: string
  clienteNome: string
  iniciais: string
  cor: string
  // Origem do alerta (permite futuras fontes: financeiro, crm, calendario...)
  categoria: "conteudo" | "renovacao" | "meta" | "tarefa"
  prioridade: PrioridadeAlerta
  texto: string
  acaoLabel: string
  acaoUrl: string
  severidade: number
}

const DIAS_SEM_POST_ATENCAO = 7 // avisa quando passou uma semana sem publicar
const DIAS_SEM_POST_CRITICO = 10 // eleva para crítico após 10 dias
const DIAS_RENOVACAO_CRITICO = 3 // renovação em até 3 dias = crítico
const DIAS_RENOVACAO_ATENCAO = 15 // até 15 dias = atenção
const DIAS_RENOVACAO_ACOMPANHAR = 30 // até 30 dias = acompanhar

// Peso base por prioridade para ordenar críticos > atenção > acompanhar.
const PESO_PRIORIDADE: Record<PrioridadeAlerta, number> = {
  critico: 300,
  atencao: 200,
  acompanhar: 100,
}

type AtencaoRow = {
  id: string
  nome: string
  iniciais: string | null
  cor: string | null
  recorrente: boolean | null
  desde: string | null
  ultima_data: string | null
  proxima_post: string | null
  pior_ratio: string | null
  tarefas_atrasadas: string | number | null
  tarefas_amanha: string | number | null
}

// Calcula quantos dias faltam para o próximo aniversário mensal de `desde`
// (a "renovação" do contrato recorrente). Retorna null se não houver data.
function diasParaRenovacao(desdeISO: string | null, hoje: Date): number | null {
  if (!desdeISO) return null
  const partes = desdeISO.split("-").map(Number)
  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return null
  const diaContrato = partes[2]
  const base = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())
  // Testa este mês e o próximo; usa o último dia do mês quando o dia não existe (ex.: 31).
  for (let offset = 0; offset <= 1; offset++) {
    const ano = hoje.getUTCFullYear()
    const mes = hoje.getUTCMonth() + offset
    const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
    const dia = Math.min(diaContrato, ultimoDia)
    const alvo = Date.UTC(ano, mes, dia)
    if (alvo >= base) {
      return Math.round((alvo - base) / 86_400_000)
    }
  }
  return null
}

function diasDesde(dataISO: string | null, hoje: Date): number | null {
  if (!dataISO) return null
  const partes = dataISO.split("-").map(Number)
  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return null
  const alvo = Date.UTC(partes[0], partes[1] - 1, partes[2])
  const base = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())
  return Math.round((base - alvo) / 86_400_000)
}

export async function getClientesAtencao(): Promise<AlertaCliente[]> {
  const rows = await query<AtencaoRow>(
    `with ult_post as (
       select empresa_id, to_char(max(data), 'YYYY-MM-DD') as ultima_data
       from public.conteudos
       where status = 'publicado' and data is not null
       group by empresa_id
     ),
     prox_post as (
       select empresa_id, to_char(min(data), 'YYYY-MM-DD') as proxima_data
       from public.conteudos
       where status <> 'publicado' and data is not null and data >= current_date
       group by empresa_id
     ),
     meta_calc as (
       select empresa_id,
              min(coalesce(atual, 0)::numeric / nullif(alvo, 0)::numeric) as pior_ratio
       from public.metas
       where alvo is not null and alvo::numeric > 0
       group by empresa_id
     ),
     tarefa_calc as (
       select empresa_id,
              count(*) filter (where prazo < current_date) as atrasadas,
              count(*) filter (where prazo = current_date + 1) as vence_amanha
       from public.tarefas
       where status <> 'concluido' and empresa_id is not null and prazo is not null
       group by empresa_id
     )
     select e.id, e.nome, e.iniciais, e.cor, e.recorrente,
            to_char(e.desde, 'YYYY-MM-DD') as desde,
            up.ultima_data,
            pp.proxima_data as proxima_post,
            mc.pior_ratio::text as pior_ratio,
            coalesce(tc.atrasadas, 0) as tarefas_atrasadas,
            coalesce(tc.vence_amanha, 0) as tarefas_amanha
     from public.empresas e
     left join ult_post up on up.empresa_id = e.id
     left join prox_post pp on pp.empresa_id = e.id
     left join meta_calc mc on mc.empresa_id = e.id
     left join tarefa_calc tc on tc.empresa_id = e.id
     -- "Ativo" no app = recorrente E status 'ativo'. Avulsos (recorrente=false)
     -- nunca entram nesta análise, mesmo que o status esteja 'ativo'.
     where e.status = 'ativo' and e.recorrente is distinct from false
     order by e.nome asc`,
  )

  const hoje = new Date()
  const alertas: AlertaCliente[] = []

  for (const r of rows) {
    const base = {
      clienteId: r.id,
      clienteNome: r.nome ?? "Sem nome",
      iniciais: r.iniciais || iniciaisDe(r.nome ?? ""),
      cor: r.cor || "bg-primary",
    }
    const verCliente = { acaoLabel: "Ver cliente", acaoUrl: `/clientes/${r.id}` }

    // 1) Conteúdo — sem publicação nova há muitos dias.
    // Se houver uma próxima publicação agendada em até 2 dias, o calendário está
    // fluindo e não geramos o alerta.
    const diasProxPost = diasDesde(r.proxima_post, hoje) // negativo = futuro
    const temProxPostBreve = diasProxPost !== null && diasProxPost >= -2
    if (!temProxPostBreve) {
      const diasPost = diasDesde(r.ultima_data, hoje)
      if (diasPost === null) {
        alertas.push({
          ...base,
          ...verCliente,
          acaoUrl: `/clientes/${r.id}?aba=conteudo`,
          categoria: "conteudo",
          prioridade: "critico",
          texto: "Ainda sem nenhum conteúdo publicado.",
          severidade: PESO_PRIORIDADE.critico + 60,
        })
      } else if (diasPost >= DIAS_SEM_POST_CRITICO) {
        alertas.push({
          ...base,
          ...verCliente,
          acaoUrl: `/clientes/${r.id}?aba=conteudo`,
          categoria: "conteudo",
          prioridade: "critico",
          texto: `Sem novo conteúdo há ${diasPost} dias.`,
          severidade: PESO_PRIORIDADE.critico + Math.min(diasPost, 50),
        })
      } else if (diasPost >= DIAS_SEM_POST_ATENCAO) {
        alertas.push({
          ...base,
          ...verCliente,
          acaoUrl: `/clientes/${r.id}?aba=conteudo`,
          categoria: "conteudo",
          prioridade: "atencao",
          texto: `Sem novo conteúdo há ${diasPost} dias.`,
          severidade: PESO_PRIORIDADE.atencao + diasPost,
        })
      }
    }

    // 2) Renovação (apenas clientes recorrentes com data de início).
    if (r.recorrente !== false) {
      const dr = diasParaRenovacao(r.desde, hoje)
      if (dr !== null) {
        if (dr === 0) {
          alertas.push({
            ...base,
            ...verCliente,
            categoria: "renovacao",
            prioridade: "critico",
            texto: "Renovação hoje.",
            severidade: PESO_PRIORIDADE.critico + 40,
          })
        } else if (dr <= DIAS_RENOVACAO_CRITICO) {
          alertas.push({
            ...base,
            ...verCliente,
            categoria: "renovacao",
            prioridade: "critico",
            texto: `Renovação em ${dr} ${dr === 1 ? "dia" : "dias"}.`,
            severidade: PESO_PRIORIDADE.critico + (DIAS_RENOVACAO_CRITICO - dr),
          })
        } else if (dr <= DIAS_RENOVACAO_ATENCAO) {
          alertas.push({
            ...base,
            ...verCliente,
            categoria: "renovacao",
            prioridade: "atencao",
            texto: `Renovação em ${dr} dias.`,
            severidade: PESO_PRIORIDADE.atencao + (DIAS_RENOVACAO_ATENCAO - dr),
          })
        } else if (dr <= DIAS_RENOVACAO_ACOMPANHAR) {
          alertas.push({
            ...base,
            ...verCliente,
            categoria: "renovacao",
            prioridade: "acompanhar",
            texto: `Renovação em ${dr} dias.`,
            severidade: PESO_PRIORIDADE.acompanhar + (DIAS_RENOVACAO_ACOMPANHAR - dr),
          })
        }
      }
    }

    // 3) Meta do mês — usa a pior razão (atual/alvo) entre as metas cadastradas.
    const ratio = r.pior_ratio !== null ? Number(r.pior_ratio) : null
    if (ratio !== null && Number.isFinite(ratio)) {
      const pct = Math.round(ratio * 100)
      const acaoMeta = { acaoLabel: "Ver resultados", acaoUrl: `/clientes/${r.id}?aba=resultados` }
      if (ratio < 0.3) {
        alertas.push({
          ...base,
          ...acaoMeta,
          categoria: "meta",
          prioridade: "critico",
          texto: `Meta do mês em ${pct}%.`,
          severidade: PESO_PRIORIDADE.critico + (30 - pct),
        })
      } else if (ratio < 0.5) {
        alertas.push({
          ...base,
          ...acaoMeta,
          categoria: "meta",
          prioridade: "atencao",
          texto: `Meta do mês em ${pct}%.`,
          severidade: PESO_PRIORIDADE.atencao + (50 - pct),
        })
      } else if (ratio < 0.7) {
        alertas.push({
          ...base,
          ...acaoMeta,
          categoria: "meta",
          prioridade: "acompanhar",
          texto: `Meta do mês em ${pct}%.`,
          severidade: PESO_PRIORIDADE.acompanhar + (70 - pct),
        })
      }
    }

    // 4) Tarefas — atrasadas (crítico) ou vencendo amanhã (atenção).
    const atrasadas = Number(r.tarefas_atrasadas ?? 0)
    const amanha = Number(r.tarefas_amanha ?? 0)
    const acaoTarefa = { acaoLabel: "Ver tarefas", acaoUrl: "/tarefas" }
    if (atrasadas > 0) {
      alertas.push({
        ...base,
        ...acaoTarefa,
        categoria: "tarefa",
        prioridade: "critico",
        texto: `${atrasadas} ${atrasadas === 1 ? "tarefa atrasada" : "tarefas atrasadas"}.`,
        severidade: PESO_PRIORIDADE.critico + 50 + Math.min(atrasadas, 20),
      })
    } else if (amanha > 0) {
      alertas.push({
        ...base,
        ...acaoTarefa,
        categoria: "tarefa",
        prioridade: "atencao",
        texto: `${amanha} ${amanha === 1 ? "tarefa vencendo amanhã" : "tarefas vencendo amanhã"}.`,
        severidade: PESO_PRIORIDADE.atencao + Math.min(amanha, 20),
      })
    }
  }

  // Ordena por prioridade (crítico > atenção > acompanhar) e, dentro dela,
  // pelo alerta mais urgente (maior severidade).
  return alertas.sort((a, b) => b.severidade - a.severidade)
}

export async function getClientePorId(id: string): Promise<Cliente | null> {
  const rows = await query<EmpresaRow>(
    `select id, nome, slug, segmento, status, responsavel_id, responsaveis_ids, mrr, recorrente, logo_url, banner_url, iniciais, cor, objetivo, contato, telefone, desde, resumo_estrategico, portal_token
     from public.empresas
     where id = $1
     limit 1`,
    [id],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

// Busca o cliente pelo token secreto do portal (link enviado ao cliente).
export async function getClientePorToken(token: string): Promise<Cliente | null> {
  const limpo = token.trim()
  if (!limpo) return null
  const rows = await query<EmpresaRow>(
    `select id, nome, slug, segmento, status, responsavel_id, responsaveis_ids, mrr, recorrente, logo_url, banner_url, iniciais, cor, objetivo, contato, telefone, desde, resumo_estrategico, portal_token
     from public.empresas
     where portal_token = $1
     limit 1`,
    [limpo],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

// Exclui o cliente e todos os dados vinculados (metas, eventos, conteúdos, etc.).
export async function excluirCliente(id: string): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("begin")
    // Remove os filhos primeiro (caso não haja ON DELETE CASCADE no schema).
    for (const tabela of [
      "public.metas",
      "public.eventos",
      "public.agenda_compromissos",
      "public.conteudos",
      "public.arquivos",
      "public.resultados",
      "public.comunicacoes",
    ]) {
      await client.query(`delete from ${tabela} where empresa_id = $1`, [id])
    }
    await client.query(`delete from public.empresas where id = $1`, [id])
    await client.query("commit")
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

// ── Estratégia (aba Estratégia) ───────────────────────────────────────────

type EstrategiaRow = {
  estrategia_atual: string[] | null
  insights: string[] | null
  concorrentes: string[] | null
}

export async function getEstrategia(empresaId: string): Promise<Estrategia> {
  const rows = await query<EstrategiaRow>(
    `select estrategia_atual, insights, concorrentes
     from public.empresas
     where id = $1
     limit 1`,
    [empresaId],
  )
  const r = rows[0]
  return {
    estrategiaAtual: r?.estrategia_atual ?? [],
    insights: r?.insights ?? [],
    concorrentes: r?.concorrentes ?? [],
  }
}

export async function salvarEstrategia(empresaId: string, input: Estrategia): Promise<void> {
  const limpar = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean)
  await query(
    `update public.empresas
     set estrategia_atual = $2, insights = $3, concorrentes = $4, updated_at = now()
     where id = $1`,
    [empresaId, limpar(input.estrategiaAtual), limpar(input.insights), limpar(input.concorrentes)],
  )
}

// ── Metas (aba Visão geral) ───────────────────────────────────────────────

type MetaRow = {
  id: string
  rotulo: string
  atual: string | null
  alvo: string | null
  unidade: string | null
}

export async function getMetas(empresaId: string): Promise<Meta[]> {
  const rows = await query<MetaRow>(
    `select id, rotulo, atual, alvo, unidade
     from public.metas
     where empresa_id = $1
     order by posicao asc, created_at asc`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    rotulo: r.rotulo,
    atual: r.atual ? Number(r.atual) : 0,
    alvo: r.alvo ? Number(r.alvo) : 0,
    unidade: r.unidade ?? "",
  }))
}

export type MetaInput = { rotulo: string; atual: number; alvo: number; unidade?: string }

// Salva a aba "Visão geral": resumo estratégico + lista de metas.
// As metas são regravadas por completo dentro de uma transação.
export async function salvarVisaoGeral(
  empresaId: string,
  resumoEstrategico: string,
  metas: MetaInput[],
): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query(`update public.empresas set resumo_estrategico = $2, updated_at = now() where id = $1`, [
      empresaId,
      resumoEstrategico.trim() || null,
    ])
    await client.query(`delete from public.metas where empresa_id = $1`, [empresaId])
    let posicao = 0
    for (const m of metas) {
      const rotulo = m.rotulo.trim()
      if (!rotulo) continue
      await client.query(
        `insert into public.metas (empresa_id, rotulo, atual, alvo, unidade, posicao)
         values ($1, $2, $3, $4, $5, $6)`,
        [empresaId, rotulo, m.atual || 0, m.alvo || 0, m.unidade?.trim() || null, posicao++],
      )
    }
    await client.query("commit")
  } catch (e) {
    await client.query("rollback")
    throw e
  } finally {
    client.release()
  }
}

// ── Eventos (aba Calendário) ──────────────────────────────────────────────

type EventoRow = {
  id: string
  titulo: string
  tipo: string | null
  data: Date | null
  hora: string | null
}

const TIPOS_EVENTO: EventoCliente["tipo"][] = ["gravacao", "post", "entrega", "reuniao"]

function formatarDataCurta(d: Date | null): string {
  if (!d) return "—"
  const data = new Date(d)
  const dia = String(data.getUTCDate()).padStart(2, "0")
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0")
  return `${dia}/${mes}`
}

export async function getEventos(empresaId: string): Promise<EventoCliente[]> {
  const rows = await query<EventoRow>(
    `select id, titulo, tipo, data, hora
     from public.agenda_compromissos
     where empresa_id = $1
     order by data asc nulls last, hora asc nulls last, created_at asc`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    clienteId: empresaId,
    titulo: r.titulo,
    tipo: (TIPOS_EVENTO.includes(r.tipo as EventoCliente["tipo"]) ? r.tipo : "gravacao") as EventoCliente["tipo"],
    data: formatarDataCurta(r.data),
    // hora vem como time ("HH:MM:SS"); exibimos só HH:MM.
    hora: r.hora ? r.hora.slice(0, 5) : "",
    // Mantém a data ISO para edição (input type=date).
    dataISO: r.data ? new Date(r.data).toISOString().slice(0, 10) : "",
  }))
}

export type EventoInput = { id?: string; titulo: string; tipo: string; data?: string; hora?: string }

// Salva a lista de eventos do cliente sincronizando por id na tabela compartilhada
// agenda_compromissos: atualiza os existentes, insere os novos e remove apenas os
// que foram apagados no editor. Isso preserva responsáveis/descrição dos eventos
// criados pelo módulo Calendário (que vivem na mesma tabela).
export async function salvarEventos(empresaId: string, eventos: EventoInput[]): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("begin")
    const existentesRes = await client.query<{ id: string }>(
      `select id from public.agenda_compromissos where empresa_id = $1`,
      [empresaId],
    )
    const existentes = new Set(existentesRes.rows.map((r) => r.id))
    const mantidos = new Set<string>()
    for (const e of eventos) {
      const titulo = e.titulo.trim()
      if (!titulo) continue
      const tipo = TIPOS_EVENTO.includes(e.tipo as EventoCliente["tipo"]) ? e.tipo : "gravacao"
      if (e.id && existentes.has(e.id)) {
        await client.query(
          `update public.agenda_compromissos
           set titulo = $2, tipo = $3, data = $4, hora = $5, updated_at = now()
           where id = $1`,
          [e.id, titulo, tipo, e.data || null, e.hora?.trim() || null],
        )
        mantidos.add(e.id)
      } else {
        await client.query(
          `insert into public.agenda_compromissos (empresa_id, titulo, tipo, data, hora)
           values ($1, $2, $3, $4, $5)`,
          [empresaId, titulo, tipo, e.data || null, e.hora?.trim() || null],
        )
      }
    }
    const remover = [...existentes].filter((id) => !mantidos.has(id))
    if (remover.length > 0) {
      await client.query(`delete from public.agenda_compromissos where id = any($1::uuid[])`, [remover])
    }
    await client.query("commit")
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

// ── Conteúdos (aba Conteúdo) ──────────────────────────────────────────────

type ConteudoRow = {
  id: string
  titulo: string
  formato: string | null
  status: string | null
  data: Date | null
  roteiro: string | null
  legenda: string | null
  direcionamento: string | null
  links: unknown
  referencia: string | null
}

// Normaliza a lista de links (coluna jsonb) para o shape LinkConteudo[],
// aceitando tanto array já parseado quanto string JSON, e descartando entradas inválidas.
function sanitizarLinks(bruto: unknown): LinkConteudo[] {
  let lista: unknown = bruto
  if (typeof bruto === "string") {
    try {
      lista = JSON.parse(bruto)
    } catch {
      return []
    }
  }
  if (!Array.isArray(lista)) return []
  return lista
    .map((item) => {
      const obj = (item ?? {}) as Record<string, unknown>
      return {
        rotulo: typeof obj.rotulo === "string" ? obj.rotulo.trim() : "",
        url: typeof obj.url === "string" ? obj.url.trim() : "",
      }
    })
    .filter((l) => l.url)
}

const FORMATOS_CONTEUDO: ConteudoItem["formato"][] = ["Reels", "Carrossel", "Story", "Vídeo", "Estático"]
const STATUS_CONTEUDO: StatusConteudo[] = ["ideia", "roteiro", "gravacao", "edicao", "aprovacao", "aprovado", "publicado"]

export async function getConteudos(empresaId: string): Promise<ConteudoItem[]> {
  const rows = await query<ConteudoRow>(
    `select id, titulo, formato, status, data, roteiro, legenda, direcionamento, links, referencia
     from public.conteudos
     where empresa_id = $1
     order by data desc nulls last, posicao desc, created_at desc`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    clienteId: empresaId,
    titulo: r.titulo,
    formato: (FORMATOS_CONTEUDO.includes(r.formato as ConteudoItem["formato"])
      ? r.formato
      : "Reels") as ConteudoItem["formato"],
    status: (STATUS_CONTEUDO.includes(r.status as StatusConteudo) ? r.status : "ideia") as StatusConteudo,
    data: formatarDataCurta(r.data),
    dataISO: r.data ? new Date(r.data).toISOString().slice(0, 10) : "",
    roteiro: r.roteiro ?? "",
    legenda: r.legenda ?? "",
    direcionamento: r.direcionamento ?? "",
    links: sanitizarLinks(r.links),
    referencia: r.referencia ?? "",
  }))
}

export type ConteudoInput = {
  titulo: string
  formato: string
  status: string
  data?: string
  roteiro?: string
  legenda?: string
  direcionamento?: string
  links?: LinkConteudo[]
  referencia?: string
}

// Salva a lista de conteúdos do cliente regravando tudo numa transação.
export async function salvarConteudos(empresaId: string, conteudos: ConteudoInput[]): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query(`delete from public.conteudos where empresa_id = $1`, [empresaId])
    let posicao = 0
    for (const c of conteudos) {
      const titulo = c.titulo.trim()
      if (!titulo) continue
      const formato = FORMATOS_CONTEUDO.includes(c.formato as ConteudoItem["formato"]) ? c.formato : "Reels"
      const status = STATUS_CONTEUDO.includes(c.status as StatusConteudo) ? c.status : "ideia"
      await client.query(
        `insert into public.conteudos (empresa_id, titulo, formato, status, data, posicao, roteiro, legenda, direcionamento, links, referencia)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)`,
        [
          empresaId,
          titulo,
          formato,
          status,
          c.data || null,
          posicao++,
          c.roteiro?.trim() || null,
          c.legenda?.trim() || null,
          c.direcionamento?.trim() || null,
          JSON.stringify(sanitizarLinks(c.links)),
          c.referencia?.trim() || null,
        ],
      )
    }
    await client.query("commit")
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

// Atualiza o roteiro, a sugestão de legenda, o direcionamento interno, os links
// do drive e o link de referência de um conteúdo do pipeline (edição individual
// aberta pelo título).
export async function atualizarRoteiroConteudo(
  empresaId: string,
  conteudoId: string,
  dados: {
    roteiro: string
    legenda: string
    direcionamento: string
    links: LinkConteudo[]
    referencia: string
  },
): Promise<void> {
  await query(
    `update public.conteudos
       set roteiro = $1, legenda = $2, direcionamento = $3, links = $4::jsonb, referencia = $5
     where id = $6 and empresa_id = $7`,
    [
      dados.roteiro.trim() || null,
      dados.legenda.trim() || null,
      dados.direcionamento.trim() || null,
      JSON.stringify(sanitizarLinks(dados.links)),
      dados.referencia.trim() || null,
      conteudoId,
      empresaId,
    ],
  )
}

// Atualiza apenas o status de um conteúdo do pipeline. Usado quando o cliente
// aprova uma peça pelo portal (status → "aprovado").
export async function atualizarStatusConteudo(
  empresaId: string,
  conteudoId: string,
  status: StatusConteudo,
): Promise<void> {
  const novoStatus = STATUS_CONTEUDO.includes(status) ? status : "aprovacao"
  await query(`update public.conteudos set status = $1 where id = $2 and empresa_id = $3`, [
    novoStatus,
    conteudoId,
    empresaId,
  ])
}

// ── Arquivos (aba Arquivos · por link) ────────────────────────────────────

type ArquivoRow = {
  id: string
  nome: string
  tipo: string | null
  url: string | null
  data_postagem: Date | null
}

const TIPOS_ARQUIVO: Arquivo["tipo"][] = ["Branding", "Material", "Drive", "Contrato"]

export async function getArquivos(empresaId: string): Promise<Arquivo[]> {
  const rows = await query<ArquivoRow>(
    `select id, nome, tipo, url, data_postagem
     from public.arquivos
     where empresa_id = $1
     order by data_postagem asc nulls last, posicao asc, created_at asc`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    clienteId: empresaId,
    nome: r.nome,
    tipo: (TIPOS_ARQUIVO.includes(r.tipo as Arquivo["tipo"]) ? r.tipo : "Material") as Arquivo["tipo"],
    tamanho: "",
    url: r.url ?? "",
    data: formatarDataCurta(r.data_postagem),
    dataISO: r.data_postagem ? new Date(r.data_postagem).toISOString().slice(0, 10) : "",
  }))
}

export type ArquivoInput = { nome: string; tipo: string; url?: string; data?: string }

export async function salvarArquivos(empresaId: string, arquivos: ArquivoInput[]): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query(`delete from public.arquivos where empresa_id = $1`, [empresaId])
    let posicao = 0
    for (const a of arquivos) {
      const nome = a.nome.trim()
      if (!nome) continue
      const tipo = TIPOS_ARQUIVO.includes(a.tipo as Arquivo["tipo"]) ? a.tipo : "Material"
      await client.query(
        `insert into public.arquivos (empresa_id, nome, tipo, url, posicao, data_postagem)
         values ($1, $2, $3, $4, $5, $6)`,
        [empresaId, nome, tipo, a.url?.trim() || null, posicao++, a.data || null],
      )
    }
    await client.query("commit")
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

// ─�� Mensagens (aba Comunicação) ───────────────────��───────────────────────

type MensagemRow = {
  id: string
  autor_id: string | null
  texto: string
  data: string | null
  de_cliente?: boolean | null
  autor_nome?: string | null
}

export async function getMensagens(empresaId: string): Promise<Mensagem[]> {
  const rows = await query<MensagemRow>(
    `select id, autor_id, texto, data, de_cliente, autor_nome
     from public.comunicacoes
     where empresa_id = $1
     order by posicao asc, created_at asc`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    clienteId: empresaId,
    autorId: r.autor_id ?? "",
    data: r.data ?? "",
    texto: r.texto,
    deCliente: r.de_cliente ?? false,
    autorNome: r.autor_nome ?? "",
  }))
}

export type MensagemInput = { autorId?: string; texto: string; data?: string }

export async function salvarMensagens(empresaId: string, mensagens: MensagemInput[]): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("begin")
    // Apaga apenas as mensagens da equipe; preserva as escritas pelo cliente no portal.
    await client.query(
      `delete from public.comunicacoes where empresa_id = $1 and coalesce(de_cliente, false) = false`,
      [empresaId],
    )
    let posicao = 0
    for (const m of mensagens) {
      const texto = m.texto.trim()
      if (!texto) continue
      await client.query(
        `insert into public.comunicacoes (empresa_id, autor_id, texto, data, posicao, de_cliente)
         values ($1, $2, $3, $4, $5, false)`,
        [empresaId, m.autorId || null, texto, m.data?.trim() || null, posicao++],
      )
    }
    await client.query("commit")
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

// Mensagem escrita pelo próprio cliente no portal (append-only, não apaga as demais).
export async function adicionarMensagemCliente(
  empresaId: string,
  texto: string,
  autorNome: string,
): Promise<void> {
  const limpo = texto.trim()
  if (!limpo) return
  const data = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  await query(
    `insert into public.comunicacoes (empresa_id, autor_id, texto, data, posicao, de_cliente, autor_nome)
     values ($1, null, $2, $3,
       coalesce((select max(posicao) from public.comunicacoes where empresa_id = $1), -1) + 1,
       true, $4)`,
    [empresaId, limpo, data, autorNome.trim() || "Cliente"],
  )
}

// Mensagens escritas pelos CLIENTES no portal (de_cliente = true), de todos os
// clientes, mais recentes primeiro. Usado para o sino de notificações da equipe.
export type NotificacaoMensagem = {
  id: string
  clienteId: string
  clienteNome: string
  iniciais: string
  cor: string
  autorNome: string
  texto: string
  data: string
  createdAt: string
}

export async function getMensagensClientesRecentes(limite = 20): Promise<NotificacaoMensagem[]> {
  const rows = await query<{
    id: string
    empresa_id: string
    empresa_nome: string
    iniciais: string | null
    cor: string | null
    autor_nome: string | null
    texto: string
    data: string | null
    created_at: string
  }>(
    `select c.id, c.empresa_id, e.nome as empresa_nome, e.iniciais, e.cor,
            c.autor_nome, c.texto, c.data, c.created_at
     from public.comunicacoes c
     join public.empresas e on e.id = c.empresa_id
     where c.de_cliente = true
     order by c.created_at desc
     limit $1`,
    [limite],
  )
  return rows.map((r) => ({
    id: r.id,
    clienteId: r.empresa_id,
    clienteNome: r.empresa_nome,
    iniciais: r.iniciais ?? "?",
    cor: r.cor ?? "bg-primary",
    autorNome: r.autor_nome ?? "Cliente",
    texto: r.texto,
    data: r.data ?? "",
    createdAt: r.created_at,
  }))
}

// Mensagem enviada pela EQUIPE (chat do painel interno) — append-only, aparece no portal
// do cliente como resposta da SIMPLE. de_cliente = false.
export async function adicionarMensagemEquipe(
  empresaId: string,
  autorId: string | null,
  texto: string,
): Promise<void> {
  const limpo = texto.trim()
  if (!limpo) return
  const data = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  await query(
    `insert into public.comunicacoes (empresa_id, autor_id, texto, data, posicao, de_cliente)
     values ($1, $2, $3, $4,
       coalesce((select max(posicao) from public.comunicacoes where empresa_id = $1), -1) + 1,
       false)`,
    [empresaId, autorId || null, limpo, data],
  )
}

// ── Resultados (aba Resultados) ───────────────────────────────────────────

type ResultadoRow = {
  id: string
  rotulo: string
  valor: string | null
  variacao: string | null
}

export async function getResultados(empresaId: string): Promise<MetricaResultado[]> {
  const rows = await query<ResultadoRow>(
    `select id, rotulo, valor, variacao
     from public.resultados
     where empresa_id = $1
     order by posicao asc, created_at asc`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    rotulo: r.rotulo,
    valor: r.valor ?? "",
    variacao: r.variacao ? Number(r.variacao) : 0,
  }))
}

export type ResultadoInput = { rotulo: string; valor: string; variacao: number }

export async function salvarResultados(empresaId: string, resultados: ResultadoInput[]): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query(`delete from public.resultados where empresa_id = $1`, [empresaId])
    let posicao = 0
    for (const r of resultados) {
      const rotulo = r.rotulo.trim()
      if (!rotulo) continue
      await client.query(
        `insert into public.resultados (empresa_id, rotulo, valor, variacao, posicao)
         values ($1, $2, $3, $4, $5)`,
        [empresaId, rotulo, r.valor.trim(), r.variacao || 0, posicao++],
      )
    }
    await client.query("commit")
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

export type NovoCliente = {
  nome: string
  segmento?: string
  status?: StatusCliente
  objetivo?: string
  contato?: string
  telefone?: string
  mrr?: number
  recorrente?: boolean
  logoUrl?: string
  desde?: string // YYYY-MM-DD
  responsavelId?: string
  responsaveisIds?: string[]
}

export async function criarCliente(input: NovoCliente): Promise<Cliente> {
  const nome = input.nome.trim()
  const status: StatusCliente = STATUS_VALIDOS.includes(input.status as StatusCliente)
    ? (input.status as StatusCliente)
    : "onboarding"

  // Garante slug único acrescentando sufixo curto se necessário.
  const baseSlug = slugDe(nome) || "cliente"
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

  const responsaveis = (input.responsaveisIds ?? []).filter(Boolean)
  const rows = await query<EmpresaRow>(
    `insert into public.empresas
       (nome, slug, segmento, status, objetivo, contato, telefone, mrr, recorrente, logo_url, iniciais, cor, desde, responsavel_id, responsaveis_ids)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::uuid[])
     returning id, nome, slug, segmento, status, responsavel_id, responsaveis_ids, mrr, recorrente, logo_url, iniciais, cor, objetivo, contato, telefone, desde`,
    [
      nome,
      slug,
      input.segmento?.trim() || null,
      status,
      input.objetivo?.trim() || null,
      input.contato?.trim() || null,
      input.telefone?.trim() || null,
      input.mrr ?? 0,
      input.recorrente ?? true,
      input.logoUrl?.trim() || null,
      iniciaisDe(nome),
      corPara(nome),
      input.desde || null,
      responsaveis[0] || null, // responsavel_id legado = primeiro responsável
      responsaveis,
    ],
  )
  return mapRow(rows[0])
}

export type AtualizarCliente = {
  nome?: string
  segmento?: string
  status?: StatusCliente
  objetivo?: string
  contato?: string
  telefone?: string
  mrr?: number
  recorrente?: boolean
  logoUrl?: string
  desde?: string // YYYY-MM-DD
  responsavelId?: string | null
  responsaveisIds?: string[]
}

// Atualiza APENAS o banner/capa do cliente (não mexe em nenhum outro campo).
export async function atualizarBanner(id: string, bannerUrl: string): Promise<void> {
  await query(
    `update public.empresas set banner_url = $2, updated_at = now() where id = $1`,
    [id, bannerUrl.trim() || null],
  )
}

export async function atualizarCliente(id: string, input: AtualizarCliente): Promise<Cliente | null> {
  const status = STATUS_VALIDOS.includes(input.status as StatusCliente)
    ? (input.status as StatusCliente)
    : undefined
  const responsaveis = (input.responsaveisIds ?? []).filter(Boolean)

  // Atualiza apenas os campos enviados (coalesce mantém o valor atual quando o parâmetro é null).
  const rows = await query<EmpresaRow>(
    `update public.empresas set
       nome           = coalesce($2, nome),
       segmento       = $3,
       status         = coalesce($4, status),
       objetivo       = $5,
       contato        = $6,
       telefone       = $7,
       mrr            = coalesce($8, mrr),
       recorrente     = coalesce($11, recorrente),
       logo_url       = $12,
       responsaveis_ids = $13::uuid[],
       desde          = $9,
       responsavel_id = $10,
       updated_at     = now()
     where id = $1
     returning id, nome, slug, segmento, status, responsavel_id, responsaveis_ids, mrr, recorrente, logo_url, iniciais, cor, objetivo, contato, telefone, desde`,
    [
      id,
      input.nome?.trim() || null,
      input.segmento?.trim() || null,
      status ?? null,
      input.objetivo?.trim() || null,
      input.contato?.trim() || null,
      input.telefone?.trim() || null,
      input.mrr ?? null,
      input.desde || null,
      responsaveis[0] || null, // responsavel_id legado = primeiro responsável
      input.recorrente ?? null,
      input.logoUrl?.trim() || null,
      responsaveis,
    ],
  )
  return rows[0] ? mapRow(rows[0]) : null
}
