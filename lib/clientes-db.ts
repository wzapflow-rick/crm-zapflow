import "server-only"
import { query, getPool } from "@/lib/db"
import type { Cliente, EventoCliente, Meta, StatusCliente } from "@/lib/simple-data"

type EmpresaRow = {
  id: string
  nome: string
  slug: string | null
  segmento: string | null
  status: string | null
  responsavel_id: string | null
  mrr: string | null
  iniciais: string | null
  cor: string | null
  objetivo: string | null
  contato: string | null
  telefone: string | null
  desde: Date | null
  resumo_estrategico?: string | null
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
  return {
    id: r.id,
    nome,
    segmento: r.segmento ?? "—",
    status,
    responsavelId: r.responsavel_id ?? "",
    mrr: r.mrr ? Number(r.mrr) : 0,
    iniciais: r.iniciais || iniciaisDe(nome),
    cor: r.cor || corPara(nome),
    objetivo: r.objetivo ?? "",
    contato: r.contato ?? "",
    telefone: r.telefone ?? "",
    desde: formatarDesde(r.desde),
    desdeISO: r.desde ? new Date(r.desde).toISOString().slice(0, 10) : "",
    resumoEstrategico: r.resumo_estrategico ?? "",
  }
}

export async function getClientes(): Promise<Cliente[]> {
  const rows = await query<EmpresaRow>(
    `select id, nome, slug, segmento, status, responsavel_id, mrr, iniciais, cor, objetivo, contato, telefone, desde
     from public.empresas
     order by created_at desc nulls last, nome asc`,
  )
  return rows.map(mapRow)
}

export async function getClientePorId(id: string): Promise<Cliente | null> {
  const rows = await query<EmpresaRow>(
    `select id, nome, slug, segmento, status, responsavel_id, mrr, iniciais, cor, objetivo, contato, telefone, desde, resumo_estrategico
     from public.empresas
     where id = $1
     limit 1`,
    [id],
  )
  return rows[0] ? mapRow(rows[0]) : null
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
     from public.eventos
     where empresa_id = $1
     order by data asc nulls last, posicao asc, created_at asc`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    clienteId: empresaId,
    titulo: r.titulo,
    tipo: (TIPOS_EVENTO.includes(r.tipo as EventoCliente["tipo"]) ? r.tipo : "gravacao") as EventoCliente["tipo"],
    data: formatarDataCurta(r.data),
    hora: r.hora ?? "",
    // Mantém a data ISO para edição (input type=date).
    dataISO: r.data ? new Date(r.data).toISOString().slice(0, 10) : "",
  }))
}

export type EventoInput = { titulo: string; tipo: string; data?: string; hora?: string }

// Salva a lista de eventos do cliente regravando tudo numa transação.
export async function salvarEventos(empresaId: string, eventos: EventoInput[]): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query(`delete from public.eventos where empresa_id = $1`, [empresaId])
    let posicao = 0
    for (const e of eventos) {
      const titulo = e.titulo.trim()
      if (!titulo) continue
      const tipo = TIPOS_EVENTO.includes(e.tipo as EventoCliente["tipo"]) ? e.tipo : "gravacao"
      await client.query(
        `insert into public.eventos (empresa_id, titulo, tipo, data, hora, posicao)
         values ($1, $2, $3, $4, $5, $6)`,
        [empresaId, titulo, tipo, e.data || null, e.hora?.trim() || null, posicao++],
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
  desde?: string // YYYY-MM-DD
  responsavelId?: string
}

export async function criarCliente(input: NovoCliente): Promise<Cliente> {
  const nome = input.nome.trim()
  const status: StatusCliente = STATUS_VALIDOS.includes(input.status as StatusCliente)
    ? (input.status as StatusCliente)
    : "onboarding"

  // Garante slug único acrescentando sufixo curto se necessário.
  const baseSlug = slugDe(nome) || "cliente"
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

  const rows = await query<EmpresaRow>(
    `insert into public.empresas
       (nome, slug, segmento, status, objetivo, contato, telefone, mrr, iniciais, cor, desde, responsavel_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning id, nome, slug, segmento, status, responsavel_id, mrr, iniciais, cor, objetivo, contato, telefone, desde`,
    [
      nome,
      slug,
      input.segmento?.trim() || null,
      status,
      input.objetivo?.trim() || null,
      input.contato?.trim() || null,
      input.telefone?.trim() || null,
      input.mrr ?? 0,
      iniciaisDe(nome),
      corPara(nome),
      input.desde || null,
      input.responsavelId || null,
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
  desde?: string // YYYY-MM-DD
  responsavelId?: string | null
}

export async function atualizarCliente(id: string, input: AtualizarCliente): Promise<Cliente | null> {
  const status = STATUS_VALIDOS.includes(input.status as StatusCliente)
    ? (input.status as StatusCliente)
    : undefined

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
       desde          = $9,
       responsavel_id = $10,
       updated_at     = now()
     where id = $1
     returning id, nome, slug, segmento, status, responsavel_id, mrr, iniciais, cor, objetivo, contato, telefone, desde`,
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
      input.responsavelId || null,
    ],
  )
  return rows[0] ? mapRow(rows[0]) : null
}
