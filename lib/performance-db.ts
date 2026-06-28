import "server-only"
import { query, getPool } from "@/lib/db"
import { FORMATOS_PERFORMANCE } from "@/lib/performance-formatos"

export { FORMATOS_PERFORMANCE }

export type ConteudoPerformance = {
  id: string
  titulo: string
  formato: string
  data: string // ISO yyyy-mm-dd ou ""
  gancho: string
  objetivo: string
  views: number | null
  curtidas: number | null
  comentarios: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  alcance: number | null
  aprendizados: string[]
  criadoEm: string
}

type Row = {
  id: string
  titulo: string
  formato: string | null
  data: Date | null
  gancho: string | null
  objetivo: string | null
  views: number | null
  curtidas: number | null
  comentarios: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  alcance: number | null
  aprendizados: unknown
  created_at: Date
}

function paraLista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.filter((v): v is string => typeof v === "string")
  return []
}

export async function getPerformance(empresaId: string): Promise<ConteudoPerformance[]> {
  const rows = await query<Row>(
    `select id, titulo, formato, data, gancho, objetivo, views, curtidas, comentarios,
            salvamentos, compartilhamentos, alcance, aprendizados, created_at
       from public.cliente_conteudo_performance
      where empresa_id = $1
      order by data desc nulls last, created_at desc`,
    [empresaId],
  )

  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    formato: r.formato ?? "Reels",
    data: r.data ? new Date(r.data).toISOString().slice(0, 10) : "",
    gancho: r.gancho ?? "",
    objetivo: r.objetivo ?? "",
    views: r.views,
    curtidas: r.curtidas,
    comentarios: r.comentarios,
    salvamentos: r.salvamentos,
    compartilhamentos: r.compartilhamentos,
    alcance: r.alcance,
    aprendizados: paraLista(r.aprendizados),
    criadoEm: new Date(r.created_at).toISOString(),
  }))
}

export type PerformanceInput = {
  titulo: string
  formato: string
  data?: string
  gancho?: string
  objetivo?: string
  views?: number | null
  curtidas?: number | null
  comentarios?: number | null
  salvamentos?: number | null
  compartilhamentos?: number | null
  alcance?: number | null
  aprendizados?: string[]
}

export async function inserirPerformance(empresaId: string, dados: PerformanceInput): Promise<void> {
  const formato = FORMATOS_PERFORMANCE.includes(dados.formato as (typeof FORMATOS_PERFORMANCE)[number])
    ? dados.formato
    : "Reels"
  await query(
    `insert into public.cliente_conteudo_performance
       (empresa_id, titulo, formato, data, gancho, objetivo, views, curtidas, comentarios,
        salvamentos, compartilhamentos, alcance, aprendizados)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      empresaId,
      dados.titulo.trim() || "Conteúdo",
      formato,
      dados.data || null,
      dados.gancho?.trim() || null,
      dados.objetivo?.trim() || null,
      dados.views ?? null,
      dados.curtidas ?? null,
      dados.comentarios ?? null,
      dados.salvamentos ?? null,
      dados.compartilhamentos ?? null,
      dados.alcance ?? null,
      JSON.stringify(dados.aprendizados ?? []),
    ],
  )
}

export async function excluirPerformance(id: string, empresaId: string): Promise<void> {
  const pool = getPool()
  await pool.query(`delete from public.cliente_conteudo_performance where id = $1 and empresa_id = $2`, [id, empresaId])
}
