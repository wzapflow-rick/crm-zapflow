import "server-only"
import { query } from "@/lib/db"

export type StatusExperimento = "em_teste" | "repetir" | "melhorar" | "descartar"

export type Experimento = {
  id: string
  hipotese: string
  oQueFoiTestado: string
  resultado: string
  conclusao: string
  status: StatusExperimento
  criadoEm: string
}

type Row = {
  id: string
  hipotese: string
  o_que_foi_testado: string | null
  resultado: string | null
  conclusao: string | null
  status: string | null
  created_at: string
}

function mapRow(r: Row): Experimento {
  const status = (r.status ?? "em_teste") as StatusExperimento
  return {
    id: r.id,
    hipotese: r.hipotese,
    oQueFoiTestado: r.o_que_foi_testado ?? "",
    resultado: r.resultado ?? "",
    conclusao: r.conclusao ?? "",
    status: ["em_teste", "repetir", "melhorar", "descartar"].includes(status) ? status : "em_teste",
    criadoEm: r.created_at,
  }
}

export async function getExperimentos(empresaId: string): Promise<Experimento[]> {
  const rows = await query<Row>(
    `SELECT id, hipotese, o_que_foi_testado, resultado, conclusao, status, created_at
     FROM public.cliente_experimento
     WHERE empresa_id = $1
     ORDER BY created_at DESC`,
    [empresaId],
  )
  return rows.map(mapRow)
}

export async function criarExperimento(
  empresaId: string,
  dados: {
    hipotese: string
    oQueFoiTestado: string
    resultado: string
    conclusao: string
    status: StatusExperimento
  },
): Promise<void> {
  await query(
    `INSERT INTO public.cliente_experimento
       (empresa_id, hipotese, o_que_foi_testado, resultado, conclusao, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [empresaId, dados.hipotese, dados.oQueFoiTestado, dados.resultado, dados.conclusao, dados.status],
  )
}

export async function excluirExperimento(id: string, empresaId: string): Promise<void> {
  await query(`DELETE FROM public.cliente_experimento WHERE id = $1 AND empresa_id = $2`, [id, empresaId])
}
