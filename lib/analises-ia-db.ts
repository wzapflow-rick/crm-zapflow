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

export type VariacaoTemporal = {
  atual: number | null
  anterior: number | null
  absoluta: number | null
  percentual: number | null
  direcao: "subiu" | "caiu" | "estavel" | "sem_dados"
}

export type ComparacaoTemporal = {
  disponivel: boolean
  atual: { analisadoEm: string; postsInstagram: number; conteudosSimple: number }
  anterior: { analisadoEm: string; postsInstagram: number; conteudosSimple: number } | null
  metricas: {
    alcanceTotal: VariacaoTemporal
    alcanceMedio: VariacaoTemporal
    engajamentoMedio: VariacaoTemporal
    curtidasTotal: VariacaoTemporal
    comentariosTotal: VariacaoTemporal
    salvamentosTotal: VariacaoTemporal
    compartilhamentosTotal: VariacaoTemporal
    visualizacoesTotal: VariacaoTemporal
  }
  qualidade: VariacaoTemporal
  padroes: { persistentes: string[]; novos: string[]; ausentes: string[] }
  resumo: string
}

function numeroOuNulo(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null
}

function variacaoTemporal(atualValor: unknown, anteriorValor: unknown): VariacaoTemporal {
  const atual = numeroOuNulo(atualValor)
  const anterior = numeroOuNulo(anteriorValor)
  if (atual === null || anterior === null) {
    return { atual, anterior, absoluta: null, percentual: null, direcao: "sem_dados" }
  }
  const absoluta = Number((atual - anterior).toFixed(2))
  const percentual = anterior === 0 ? null : Number(((absoluta / Math.abs(anterior)) * 100).toFixed(2))
  return {
    atual,
    anterior,
    absoluta,
    percentual,
    direcao: absoluta > 0 ? "subiu" : absoluta < 0 ? "caiu" : "estavel",
  }
}

function nomesPadroes(analise: AnaliseIaHistorico | null): string[] {
  if (!analise || !Array.isArray(analise.padroes)) return []
  return analise.padroes.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const padrao = (item as { padrao?: unknown }).padrao
    return typeof padrao === "string" && padrao.trim() ? [padrao.trim()] : []
  })
}

function formatarVariacao(label: string, variacao: VariacaoTemporal): string {
  if (variacao.direcao === "sem_dados") return `${label}: sem dados comparáveis`
  const percentual = variacao.percentual === null ? "percentual indisponível" : `${variacao.percentual > 0 ? "+" : ""}${variacao.percentual}%`
  return `${label}: ${variacao.direcao} (${variacao.absoluta! > 0 ? "+" : ""}${variacao.absoluta}, ${percentual})`
}

export function compararAnalisesIa(historico: AnaliseIaHistorico[]): ComparacaoTemporal {
  const atual = historico[0]
  const anterior = historico[1] ?? null
  const vazio = { atual: null, anterior: null, absoluta: null, percentual: null, direcao: "sem_dados" as const }
  if (!atual || !anterior) {
    return {
      disponivel: false,
      atual: atual
        ? { analisadoEm: atual.analisadoEm, postsInstagram: atual.postsInstagram, conteudosSimple: atual.conteudosSimple }
        : { analisadoEm: "", postsInstagram: 0, conteudosSimple: 0 },
      anterior: null,
      metricas: { alcanceTotal: vazio, alcanceMedio: vazio, engajamentoMedio: vazio, curtidasTotal: vazio, comentariosTotal: vazio, salvamentosTotal: vazio, compartilhamentosTotal: vazio, visualizacoesTotal: vazio },
      qualidade: vazio,
      padroes: { persistentes: [], novos: [], ausentes: [] },
      resumo: "Ainda não há duas análises válidas do mesmo cliente para comparar evolução.",
    }
  }

  const metricasAtual = atual.metricas
  const metricasAnterior = anterior.metricas
  const metricas = {
    alcanceTotal: variacaoTemporal(metricasAtual.alcanceTotal, metricasAnterior.alcanceTotal),
    alcanceMedio: variacaoTemporal(metricasAtual.alcanceMedio, metricasAnterior.alcanceMedio),
    engajamentoMedio: variacaoTemporal(metricasAtual.engajamentoMedio, metricasAnterior.engajamentoMedio),
    curtidasTotal: variacaoTemporal(metricasAtual.curtidasTotal, metricasAnterior.curtidasTotal),
    comentariosTotal: variacaoTemporal(metricasAtual.comentariosTotal, metricasAnterior.comentariosTotal),
    salvamentosTotal: variacaoTemporal(metricasAtual.salvamentosTotal, metricasAnterior.salvamentosTotal),
    compartilhamentosTotal: variacaoTemporal(metricasAtual.compartilhamentosTotal, metricasAnterior.compartilhamentosTotal),
    visualizacoesTotal: variacaoTemporal(metricasAtual.visualizacoesTotal, metricasAnterior.visualizacoesTotal),
  }
  const qualidade = variacaoTemporal(atual.qualidade.percentual, anterior.qualidade.percentual)
  const atuais = nomesPadroes(atual)
  const anteriores = nomesPadroes(anterior)
  const anterioresNormalizados = new Map(anteriores.map((padrao) => [padrao.toLocaleLowerCase("pt-BR"), padrao]))
  const atuaisNormalizados = new Map(atuais.map((padrao) => [padrao.toLocaleLowerCase("pt-BR"), padrao]))
  const persistentes = atuais.filter((padrao) => anterioresNormalizados.has(padrao.toLocaleLowerCase("pt-BR")))
  const novos = atuais.filter((padrao) => !anterioresNormalizados.has(padrao.toLocaleLowerCase("pt-BR")))
  const ausentes = anteriores.filter((padrao) => !atuaisNormalizados.has(padrao.toLocaleLowerCase("pt-BR")))
  const resumo = [
    formatarVariacao("Alcance total", metricas.alcanceTotal),
    formatarVariacao("Alcance médio", metricas.alcanceMedio),
    formatarVariacao("Engajamento médio", metricas.engajamentoMedio),
    formatarVariacao("Qualidade dos dados", qualidade),
    `Volume: ${atual.postsInstagram} posts agora contra ${anterior.postsInstagram} anteriormente.`,
  ].join(" | ")

  return {
    disponivel: true,
    atual: { analisadoEm: atual.analisadoEm, postsInstagram: atual.postsInstagram, conteudosSimple: atual.conteudosSimple },
    anterior: { analisadoEm: anterior.analisadoEm, postsInstagram: anterior.postsInstagram, conteudosSimple: anterior.conteudosSimple },
    metricas,
    qualidade,
    padroes: { persistentes, novos, ausentes },
    resumo,
  }
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
