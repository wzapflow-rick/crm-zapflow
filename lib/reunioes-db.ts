import { query } from "@/lib/db"

// Memória de reuniões de um cliente — uso INTERNO da SIMPLE.
// Nunca é exposto no portal do cliente.
export type Reuniao = {
  id: string
  titulo: string
  data: string // ISO (data da reunião)
  resumo: string
  decisoes: string[]
  problemas: string[]
  proximasAcoes: string[]
  insights: string[]
  notasOriginais: string
  criadoEm: string // ISO
}

type ReuniaoRow = {
  id: string
  titulo: string | null
  data_reuniao: Date | string | null
  resumo: string | null
  decisoes: unknown
  problemas: unknown
  proximas_acoes: unknown
  insights: unknown
  notas_originais: string | null
  created_at: Date | string | null
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean)
  return []
}

// O driver pg devolve colunas date/timestamptz como Date; o tipo Reuniao expõe texto ISO.
function asISO(v: Date | string | null): string | null {
  if (v == null) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function mapRow(r: ReuniaoRow): Reuniao {
  const criadoEm = asISO(r.created_at) ?? new Date().toISOString()
  return {
    id: r.id,
    titulo: r.titulo ?? "Reunião",
    data: asISO(r.data_reuniao) ?? criadoEm,
    resumo: r.resumo ?? "",
    decisoes: asStringArray(r.decisoes),
    problemas: asStringArray(r.problemas),
    proximasAcoes: asStringArray(r.proximas_acoes),
    insights: asStringArray(r.insights),
    notasOriginais: r.notas_originais ?? "",
    criadoEm,
  }
}

export async function getReunioes(empresaId: string): Promise<Reuniao[]> {
  const rows = await query<ReuniaoRow>(
    `select id, titulo, data_reuniao, resumo, decisoes, problemas, proximas_acoes, insights, notas_originais, created_at
     from public.cliente_reuniao
     where empresa_id = $1
     order by data_reuniao desc nulls last, created_at desc`,
    [empresaId],
  )
  return rows.map(mapRow)
}

export type NovaReuniao = {
  empresaId: string
  titulo: string
  data: string | null
  resumo: string
  decisoes: string[]
  problemas: string[]
  proximasAcoes: string[]
  insights: string[]
  notasOriginais: string
}

export async function criarReuniao(input: NovaReuniao): Promise<Reuniao> {
  const rows = await query<ReuniaoRow>(
    `insert into public.cliente_reuniao
       (empresa_id, titulo, data_reuniao, resumo, decisoes, problemas, proximas_acoes, insights, notas_originais)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9)
     returning id, titulo, data_reuniao, resumo, decisoes, problemas, proximas_acoes, insights, notas_originais, created_at`,
    [
      input.empresaId,
      input.titulo.trim() || "Reunião",
      input.data || null,
      input.resumo?.trim() || null,
      JSON.stringify(input.decisoes ?? []),
      JSON.stringify(input.problemas ?? []),
      JSON.stringify(input.proximasAcoes ?? []),
      JSON.stringify(input.insights ?? []),
      input.notasOriginais?.trim() || null,
    ],
  )
  return mapRow(rows[0])
}

export async function excluirReuniao(id: string, empresaId: string): Promise<void> {
  await query(`delete from public.cliente_reuniao where id = $1 and empresa_id = $2`, [id, empresaId])
}
