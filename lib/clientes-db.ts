import "server-only"
import { query } from "@/lib/db"
import type { Cliente, StatusCliente } from "@/lib/simple-data"

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
    `select id, nome, slug, segmento, status, responsavel_id, mrr, iniciais, cor, objetivo, contato, telefone, desde
     from public.empresas
     where id = $1
     limit 1`,
    [id],
  )
  return rows[0] ? mapRow(rows[0]) : null
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
       (nome, slug, segmento, status, objetivo, contato, telefone, mrr, iniciais, cor, desde)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    ],
  )
  return mapRow(rows[0])
}
