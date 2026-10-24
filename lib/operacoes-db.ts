import "server-only"
import { query } from "@/lib/db"

export type StatusOperacao = "planejamento" | "em_andamento" | "concluida"

export type Operacao = {
  id: string
  titulo: string
  objetivo: string
  status: StatusOperacao
  metodologia: string
  vencedor: string
  resumo: string
  dadosBrutos: string
  variacoes: string[]
  metricas: string[]
  aprendizados: string[]
  recomendacoes: string[]
  criadoEm: string
  atualizadoEm: string
}

type Row = {
  id: string
  titulo: string
  objetivo: string | null
  status: string | null
  metodologia: string | null
  vencedor: string | null
  resumo: string | null
  dados_brutos: string | null
  variacoes: unknown
  metricas: unknown
  aprendizados: unknown
  recomendacoes: unknown
  created_at: string
  updated_at: string
}

const STATUS_VALIDOS: StatusOperacao[] = ["planejamento", "em_andamento", "concluida"]

// jsonb já volta parseado do pg; normalizamos para array de strings por segurança.
function comoLista(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean)
  return []
}

function mapRow(r: Row): Operacao {
  const status = (r.status ?? "em_andamento") as StatusOperacao
  return {
    id: r.id,
    titulo: r.titulo,
    objetivo: r.objetivo ?? "",
    status: STATUS_VALIDOS.includes(status) ? status : "em_andamento",
    metodologia: r.metodologia ?? "",
    vencedor: r.vencedor ?? "",
    resumo: r.resumo ?? "",
    dadosBrutos: r.dados_brutos ?? "",
    variacoes: comoLista(r.variacoes),
    metricas: comoLista(r.metricas),
    aprendizados: comoLista(r.aprendizados),
    recomendacoes: comoLista(r.recomendacoes),
    criadoEm: r.created_at,
    atualizadoEm: r.updated_at,
  }
}

export async function getOperacoes(): Promise<Operacao[]> {
  const rows = await query<Row>(
    `SELECT id, titulo, objetivo, status, metodologia, vencedor, resumo, dados_brutos,
            variacoes, metricas, aprendizados, recomendacoes, created_at, updated_at
     FROM public.operacao
     ORDER BY
       CASE status WHEN 'em_andamento' THEN 0 WHEN 'planejamento' THEN 1 ELSE 2 END,
       created_at DESC`,
  )
  return rows.map(mapRow)
}

export type DadosOperacao = {
  titulo: string
  objetivo: string
  status: StatusOperacao
  metodologia: string
  vencedor: string
  resumo: string
  dadosBrutos: string
  variacoes: string[]
  metricas: string[]
  aprendizados: string[]
  recomendacoes: string[]
}

export async function criarOperacao(dados: DadosOperacao): Promise<void> {
  await query(
    `INSERT INTO public.operacao
       (titulo, objetivo, status, metodologia, vencedor, resumo, dados_brutos,
        variacoes, metricas, aprendizados, recomendacoes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      dados.titulo,
      dados.objetivo,
      dados.status,
      dados.metodologia,
      dados.vencedor,
      dados.resumo,
      dados.dadosBrutos,
      JSON.stringify(dados.variacoes),
      JSON.stringify(dados.metricas),
      JSON.stringify(dados.aprendizados),
      JSON.stringify(dados.recomendacoes),
    ],
  )
}

export async function excluirOperacao(id: string): Promise<void> {
  await query(`DELETE FROM public.operacao WHERE id = $1`, [id])
}
