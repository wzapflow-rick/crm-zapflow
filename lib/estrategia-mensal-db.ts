import "server-only"
import { query } from "@/lib/db"

export type CampanhaMensal = { nome: string; descricao: string }
export type KpiMensal = { rotulo: string; alvo: string; realizado: string }
export type StatusEstrategiaMensal = "planejado" | "em_andamento" | "concluido"

export const STATUS_ESTRATEGIA_MENSAL: StatusEstrategiaMensal[] = ["planejado", "em_andamento", "concluido"]

export type EstrategiaMensal = {
  id: string
  competencia: string // YYYY-MM
  objetivo: string
  pilares: string[]
  campanhas: CampanhaMensal[]
  kpis: KpiMensal[]
  calendarioResumo: string
  retrospectiva: string
  status: StatusEstrategiaMensal
  criadoEm: string
  atualizadoEm: string
}

export type EstrategiaMensalInput = {
  competencia: string
  objetivo?: string
  pilares?: string[]
  campanhas?: CampanhaMensal[]
  kpis?: KpiMensal[]
  calendarioResumo?: string
  retrospectiva?: string
  status?: StatusEstrategiaMensal
}

type Row = {
  id: string
  competencia: string
  objetivo: string | null
  pilares: string[] | null
  campanhas: unknown
  kpis: unknown
  calendario_resumo: string | null
  retrospectiva: string | null
  status: string
  criado_em: Date
  atualizado_em: Date
}

function paraCampanhas(valor: unknown): CampanhaMensal[] {
  if (!Array.isArray(valor)) return []
  return valor
    .map((v) => {
      const item = (v ?? {}) as Record<string, unknown>
      return { nome: String(item.nome ?? "").trim(), descricao: String(item.descricao ?? "").trim() }
    })
    .filter((c) => c.nome)
}

function paraKpis(valor: unknown): KpiMensal[] {
  if (!Array.isArray(valor)) return []
  return valor
    .map((v) => {
      const item = (v ?? {}) as Record<string, unknown>
      return {
        rotulo: String(item.rotulo ?? "").trim(),
        alvo: String(item.alvo ?? "").trim(),
        realizado: String(item.realizado ?? "").trim(),
      }
    })
    .filter((k) => k.rotulo)
}

function normalizarStatus(valor: string): StatusEstrategiaMensal {
  return STATUS_ESTRATEGIA_MENSAL.includes(valor as StatusEstrategiaMensal)
    ? (valor as StatusEstrategiaMensal)
    : "planejado"
}

function mapear(r: Row): EstrategiaMensal {
  return {
    id: r.id,
    competencia: r.competencia,
    objetivo: r.objetivo ?? "",
    pilares: (r.pilares ?? []).map((s) => s.trim()).filter(Boolean),
    campanhas: paraCampanhas(r.campanhas),
    kpis: paraKpis(r.kpis),
    calendarioResumo: r.calendario_resumo ?? "",
    retrospectiva: r.retrospectiva ?? "",
    status: normalizarStatus(r.status),
    criadoEm: new Date(r.criado_em).toISOString(),
    atualizadoEm: new Date(r.atualizado_em).toISOString(),
  }
}

export async function getEstrategiasMensais(empresaId: string): Promise<EstrategiaMensal[]> {
  const rows = await query<Row>(
    `select id, competencia, objetivo, pilares, campanhas, kpis, calendario_resumo, retrospectiva, status, criado_em, atualizado_em
       from public.cliente_estrategia_mensal
      where empresa_id = $1
      order by competencia desc`,
    [empresaId],
  )
  return rows.map(mapear)
}

// Upsert por (empresa_id, competencia): salvar duas vezes o mesmo mês atualiza o plano.
export async function salvarEstrategiaMensal(empresaId: string, input: EstrategiaMensalInput): Promise<void> {
  const pilares = (input.pilares ?? []).map((s) => s.trim()).filter(Boolean)
  const campanhas = (input.campanhas ?? [])
    .map((c) => ({ nome: c.nome.trim(), descricao: c.descricao.trim() }))
    .filter((c) => c.nome)
  const kpis = (input.kpis ?? [])
    .map((k) => ({ rotulo: k.rotulo.trim(), alvo: k.alvo.trim(), realizado: k.realizado.trim() }))
    .filter((k) => k.rotulo)

  await query(
    `insert into public.cliente_estrategia_mensal
       (empresa_id, competencia, objetivo, pilares, campanhas, kpis, calendario_resumo, retrospectiva, status)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
     on conflict (empresa_id, competencia) do update
       set objetivo = excluded.objetivo,
           pilares = excluded.pilares,
           campanhas = excluded.campanhas,
           kpis = excluded.kpis,
           calendario_resumo = excluded.calendario_resumo,
           retrospectiva = excluded.retrospectiva,
           status = excluded.status,
           atualizado_em = now()`,
    [
      empresaId,
      input.competencia,
      input.objetivo?.trim() || null,
      pilares,
      JSON.stringify(campanhas),
      JSON.stringify(kpis),
      input.calendarioResumo?.trim() || null,
      input.retrospectiva?.trim() || null,
      normalizarStatus(input.status ?? "planejado"),
    ],
  )
}

export async function excluirEstrategiaMensal(id: string, empresaId: string): Promise<void> {
  await query(`delete from public.cliente_estrategia_mensal where id = $1 and empresa_id = $2`, [id, empresaId])
}
