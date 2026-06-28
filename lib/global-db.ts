import "server-only"
import { query } from "@/lib/db"

export type ConfiancaGlobal = "alta" | "media" | "baixa"

export type AprendizadoGlobal = {
  id: string
  categoria: string
  aprendizado: string
  baseAmostral: string
  confianca: ConfiancaGlobal
  criadoEm: string
}

type Row = {
  id: string
  categoria: string | null
  aprendizado: string
  base_amostral: string | null
  confianca: string | null
  created_at: string
}

function mapRow(r: Row): AprendizadoGlobal {
  return {
    id: r.id,
    categoria: r.categoria ?? "Geral",
    aprendizado: r.aprendizado,
    baseAmostral: r.base_amostral ?? "",
    confianca: (r.confianca as ConfiancaGlobal) ?? "media",
    criadoEm: r.created_at,
  }
}

export async function getAprendizadosGlobais(): Promise<AprendizadoGlobal[]> {
  const rows = await query<Row>(
    `SELECT id, categoria, aprendizado, base_amostral, confianca, created_at
     FROM inteligencia_global
     ORDER BY
       CASE confianca WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
       created_at DESC`,
  )
  return rows.map(mapRow)
}

// A análise substitui os aprendizados anteriores (sempre reflete o estado atual da base).
export async function substituirAprendizadosGlobais(
  aprendizados: { categoria: string; aprendizado: string; baseAmostral: string; confianca: ConfiancaGlobal }[],
): Promise<void> {
  await query("DELETE FROM inteligencia_global")
  for (const a of aprendizados) {
    await query(
      `INSERT INTO inteligencia_global (categoria, aprendizado, base_amostral, confianca)
       VALUES ($1, $2, $3, $4)`,
      [a.categoria, a.aprendizado, a.baseAmostral, a.confianca],
    )
  }
}

export async function getUltimaAnaliseGlobal(): Promise<string | null> {
  const rows = await query<{ created_at: string }>(
    `SELECT created_at FROM inteligencia_global ORDER BY created_at DESC LIMIT 1`,
  )
  return rows[0]?.created_at ?? null
}

// ----- Agregação ANÔNIMA da base (nunca expõe empresa_id/nome de cliente) -----

export type BaseAgregada = {
  totalClientes: number
  padroesPorCategoria: { categoria: string; quantidade: number; exemplos: string[] }[]
  performancePorFormato: {
    formato: string
    amostras: number
    mediaViews: number | null
    mediaSalvamentos: number | null
    mediaComentarios: number | null
  }[]
  experimentosPorStatus: { status: string; quantidade: number; exemplos: string[] }[]
}

export async function agregarBaseAnonima(): Promise<BaseAgregada> {
  const [clientes, padroes, performance, experimentos] = await Promise.all([
    query<{ total: string }>(`SELECT COUNT(*)::int AS total FROM empresas`).catch(() => [{ total: "0" }]),
    query<{ categoria: string | null; quantidade: string; exemplos: string[] }>(
      `SELECT categoria, COUNT(*)::int AS quantidade,
              (ARRAY_AGG(padrao ORDER BY CASE confianca WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END))[1:3] AS exemplos
       FROM cliente_padrao
       GROUP BY categoria
       ORDER BY quantidade DESC`,
    ).catch(() => []),
    query<{
      formato: string | null
      amostras: string
      media_views: number | null
      media_salvamentos: number | null
      media_comentarios: number | null
    }>(
      `SELECT formato,
              COUNT(*)::int AS amostras,
              ROUND(AVG(views))::int AS media_views,
              ROUND(AVG(salvamentos))::int AS media_salvamentos,
              ROUND(AVG(comentarios))::int AS media_comentarios
       FROM cliente_conteudo_performance
       GROUP BY formato
       ORDER BY amostras DESC`,
    ).catch(() => []),
    query<{ status: string | null; quantidade: string; exemplos: string[] }>(
      `SELECT status, COUNT(*)::int AS quantidade,
              (ARRAY_AGG(hipotese))[1:3] AS exemplos
       FROM cliente_experimento
       GROUP BY status
       ORDER BY quantidade DESC`,
    ).catch(() => []),
  ])

  return {
    totalClientes: Number(clientes[0]?.total ?? 0),
    padroesPorCategoria: padroes.map((p) => ({
      categoria: p.categoria ?? "Geral",
      quantidade: Number(p.quantidade),
      exemplos: (p.exemplos ?? []).filter(Boolean),
    })),
    performancePorFormato: performance.map((p) => ({
      formato: p.formato ?? "Outro",
      amostras: Number(p.amostras),
      mediaViews: p.media_views,
      mediaSalvamentos: p.media_salvamentos,
      mediaComentarios: p.media_comentarios,
    })),
    experimentosPorStatus: experimentos.map((e) => ({
      status: e.status ?? "em_teste",
      quantidade: Number(e.quantidade),
      exemplos: (e.exemplos ?? []).filter(Boolean),
    })),
  }
}
