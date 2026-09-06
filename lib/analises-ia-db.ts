import "server-only"

import { query } from "@/lib/db"

export type AnaliseIaHistorico = {
  id: string
  analisadoEm: string
  periodoInicio: string | null
  periodoFim: string | null
  postsInstagram: number
  conteudosSimple: number
  resumo: Record<string, unknown>
  metricas: Record<string, unknown>
  qualidade: Record<string, unknown>
  padroes: unknown[]
}

type AnaliseRow = {
  id: string
  analisado_em: string
  periodo_inicio: string | null
  periodo_fim: string | null
  posts_instagram: number
  conteudos_simple: number
  resumo: Record<string, unknown> | null
  metricas: Record<string, unknown> | null
  qualidade: Record<string, unknown> | null
  padroes: unknown[] | null
}

function mapAnalise(row: AnaliseRow): AnaliseIaHistorico {
  return {
    id: row.id,
    analisadoEm: row.analisado_em,
    periodoInicio: row.periodo_inicio,
    periodoFim: row.periodo_fim,
    postsInstagram: row.posts_instagram,
    conteudosSimple: row.conteudos_simple,
    resumo: row.resumo ?? {},
    metricas: row.metricas ?? {},
    qualidade: row.qualidade ?? {},
    padroes: row.padroes ?? [],
  }
}

export async function salvarAnaliseIa(input: {
  empresaId: string
  analisadoEm: string
  periodoInicio: string | null
  periodoFim: string | null
  postsInstagram: number
  conteudosSimple: number
  resumo: Record<string, unknown>
  metricas: Record<string, unknown>
  qualidade: Record<string, unknown>
  padroes: unknown[]
}): Promise<void> {
  await query(
    `INSERT INTO public.cliente_analise_ia
      (empresa_id, analisado_em, periodo_inicio, periodo_fim, posts_instagram,
       conteudos_simple, resumo, metricas, qualidade, padroes)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb)`,
    [
      input.empresaId,
      input.analisadoEm,
      input.periodoInicio,
      input.periodoFim,
      input.postsInstagram,
      input.conteudosSimple,
      JSON.stringify(input.resumo),
      JSON.stringify(input.metricas),
      JSON.stringify(input.qualidade),
      JSON.stringify(input.padroes),
    ],
  )
}

export async function getHistoricoAnalisesIa(empresaId: string, limite = 5): Promise<AnaliseIaHistorico[]> {
  try {
    const rows = await query<AnaliseRow>(
      `SELECT id, analisado_em, periodo_inicio, periodo_fim, posts_instagram,
              conteudos_simple, resumo, metricas, qualidade, padroes
       FROM public.cliente_analise_ia
       WHERE empresa_id = $1
       ORDER BY analisado_em DESC
       LIMIT $2`,
      [empresaId, Math.min(Math.max(limite, 1), 12)],
    )
    return rows.map(mapAnalise)
  } catch (error) {
    console.warn("[inteligencia] histórico analítico indisponível:", error instanceof Error ? error.message : error)
    return []
  }
}
