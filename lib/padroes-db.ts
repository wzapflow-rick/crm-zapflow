import "server-only"
import { query } from "@/lib/db"

export type ConfiancaPadrao = "alta" | "media" | "baixa"

export type Padrao = {
  id: string
  categoria: string
  padrao: string
  evidencia: string
  confianca: ConfiancaPadrao
  criadoEm: string
}

type Row = {
  id: string
  categoria: string | null
  padrao: string
  evidencia: string | null
  confianca: string | null
  created_at: string
}

function mapRow(r: Row): Padrao {
  return {
    id: r.id,
    categoria: r.categoria ?? "Geral",
    padrao: r.padrao,
    evidencia: r.evidencia ?? "",
    confianca: (r.confianca as ConfiancaPadrao) ?? "media",
    criadoEm: r.created_at,
  }
}

export async function getPadroes(empresaId: string): Promise<Padrao[]> {
  const rows = await query<Row>(
    `SELECT id, categoria, padrao, evidencia, confianca, created_at
     FROM cliente_padrao
     WHERE empresa_id = $1
     ORDER BY
       CASE confianca WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
       created_at DESC`,
    [empresaId],
  )
  return rows.map(mapRow)
}

// A análise substitui os padrões anteriores (sempre reflete o estado atual dos dados).
export async function substituirPadroes(
  empresaId: string,
  padroes: { categoria: string; padrao: string; evidencia: string; confianca: ConfiancaPadrao }[],
): Promise<void> {
  await query("DELETE FROM cliente_padrao WHERE empresa_id = $1", [empresaId])
  for (const p of padroes) {
    await query(
      `INSERT INTO cliente_padrao (empresa_id, categoria, padrao, evidencia, confianca)
       VALUES ($1, $2, $3, $4, $5)`,
      [empresaId, p.categoria, p.padrao, p.evidencia, p.confianca],
    )
  }
}

export async function getUltimaAnalise(empresaId: string): Promise<string | null> {
  const rows = await query<{ created_at: string }>(
    `SELECT created_at FROM cliente_padrao WHERE empresa_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [empresaId],
  )
  return rows[0]?.created_at ?? null
}
