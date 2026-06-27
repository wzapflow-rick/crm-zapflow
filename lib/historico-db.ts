import { query } from "@/lib/db"

// Registro de evolução ("save") mensal de um cliente — uso INTERNO da SIMPLE.
// Nunca é exposto no portal do cliente.
export type MetricaHistorico = { rotulo: string; valor: string }

export type RegistroHistorico = {
  id: string
  referencia: string // ex.: "Mês 1", "Janeiro 2026"
  metricas: MetricaHistorico[]
  resolvidos: string[]
  novosProblemas: string[]
  proximosPassos: string[]
  analise: string
  notasOriginais: string
  criadoEm: string // ISO
}

type HistoricoRow = {
  id: string
  referencia: string | null
  metricas: unknown
  resolvidos: unknown
  novos_problemas: unknown
  proximos_passos: unknown
  analise: string | null
  notas_originais: string | null
  created_at: string | null
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean)
  return []
}

function asMetricas(v: unknown): MetricaHistorico[] {
  if (!Array.isArray(v)) return []
  return v
    .map((m) => {
      const obj = m as Record<string, unknown>
      return { rotulo: String(obj?.rotulo ?? ""), valor: String(obj?.valor ?? "") }
    })
    .filter((m) => m.rotulo || m.valor)
}

function mapRow(r: HistoricoRow): RegistroHistorico {
  return {
    id: r.id,
    referencia: r.referencia ?? "Sem período",
    metricas: asMetricas(r.metricas),
    resolvidos: asStringArray(r.resolvidos),
    novosProblemas: asStringArray(r.novos_problemas),
    proximosPassos: asStringArray(r.proximos_passos),
    analise: r.analise ?? "",
    notasOriginais: r.notas_originais ?? "",
    criadoEm: r.created_at ?? new Date().toISOString(),
  }
}

export async function getHistorico(empresaId: string): Promise<RegistroHistorico[]> {
  const rows = await query<HistoricoRow>(
    `select id, referencia, metricas, resolvidos, novos_problemas, proximos_passos, analise, notas_originais, created_at
     from public.cliente_historico
     where empresa_id = $1
     order by created_at desc`,
    [empresaId],
  )
  return rows.map(mapRow)
}

export type NovoRegistroHistorico = {
  empresaId: string
  referencia: string
  metricas: MetricaHistorico[]
  resolvidos: string[]
  novosProblemas: string[]
  proximosPassos: string[]
  analise: string
  notasOriginais: string
}

export async function criarRegistroHistorico(input: NovoRegistroHistorico): Promise<RegistroHistorico> {
  const rows = await query<HistoricoRow>(
    `insert into public.cliente_historico
       (empresa_id, referencia, metricas, resolvidos, novos_problemas, proximos_passos, analise, notas_originais)
     values ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)
     returning id, referencia, metricas, resolvidos, novos_problemas, proximos_passos, analise, notas_originais, created_at`,
    [
      input.empresaId,
      input.referencia.trim() || "Sem período",
      JSON.stringify(input.metricas ?? []),
      JSON.stringify(input.resolvidos ?? []),
      JSON.stringify(input.novosProblemas ?? []),
      JSON.stringify(input.proximosPassos ?? []),
      input.analise?.trim() || null,
      input.notasOriginais?.trim() || null,
    ],
  )
  return mapRow(rows[0])
}

export async function excluirRegistroHistorico(id: string, empresaId: string): Promise<void> {
  await query(`delete from public.cliente_historico where id = $1 and empresa_id = $2`, [id, empresaId])
}
