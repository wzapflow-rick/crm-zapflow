import "server-only"
import { getClientePorId, getMetas, getEstrategia, getConteudos, getResultados } from "@/lib/clientes-db"
import { getHistorico } from "@/lib/historico-db"

// Resumo enxuto do contexto, usado para o painel "Contexto Atual" na UI.
export type ResumoContexto = {
  nome: string
  segmento: string
  status: string
  desde: string
  objetivo: string
  blocos: { rotulo: string; itens: number }[]
}

export type ContextoCliente = {
  resumo: ResumoContexto
  // Texto formatado injetado no system prompt da IA.
  texto: string
}

function linhasMetas(metas: { rotulo: string; atual: number; alvo: number; unidade?: string }[]) {
  return metas
    .map((m) => `- ${m.rotulo}: ${m.atual}${m.unidade ?? ""} de ${m.alvo}${m.unidade ?? ""}`)
    .join("\n")
}

// Monta TODA a memória disponível do cliente no banco e devolve em dois formatos:
// um resumo para a UI e um texto pronto para o system prompt.
export async function montarContextoCliente(empresaId: string): Promise<ContextoCliente | null> {
  const cliente = await getClientePorId(empresaId)
  if (!cliente) return null

  const [metas, estrategia, conteudos, resultados, historico] = await Promise.all([
    getMetas(empresaId).catch(() => []),
    getEstrategia(empresaId).catch(() => ({ estrategiaAtual: [], insights: [], concorrentes: [] })),
    getConteudos(empresaId).catch(() => []),
    getResultados(empresaId).catch(() => []),
    getHistorico(empresaId).catch(() => []),
  ])

  const partes: string[] = []

  partes.push(`## CLIENTE: ${cliente.nome}`)
  partes.push(
    `Segmento: ${cliente.segmento} | Status: ${cliente.status} | Cliente desde: ${cliente.desde} | Modelo: ${cliente.recorrente ? "recorrente" : "avulso"}`,
  )
  if (cliente.objetivo) partes.push(`Objetivo principal: ${cliente.objetivo}`)
  if (cliente.resumoEstrategico) partes.push(`Resumo estratégico: ${cliente.resumoEstrategico}`)

  if (metas.length > 0) {
    partes.push(`\n## METAS / KPIs\n${linhasMetas(metas)}`)
  }

  if (estrategia.estrategiaAtual.length > 0) {
    partes.push(`\n## ESTRATÉGIA ATUAL\n${estrategia.estrategiaAtual.map((s) => `- ${s}`).join("\n")}`)
  }
  if (estrategia.insights.length > 0) {
    partes.push(`\n## INSIGHTS\n${estrategia.insights.map((s) => `- ${s}`).join("\n")}`)
  }
  if (estrategia.concorrentes.length > 0) {
    partes.push(`\n## CONCORRENTES\n${estrategia.concorrentes.map((s) => `- ${s}`).join("\n")}`)
  }

  if (resultados.length > 0) {
    partes.push(
      `\n## RESULTADOS RECENTES\n${resultados
        .map((r) => `- ${r.rotulo}: ${r.valor} (${r.variacao >= 0 ? "+" : ""}${r.variacao}%)`)
        .join("\n")}`,
    )
  }

  if (conteudos.length > 0) {
    const amostra = conteudos.slice(0, 15)
    partes.push(
      `\n## CONTEÚDOS (${conteudos.length} no total, amostra)\n${amostra
        .map((c) => `- [${c.status}] ${c.titulo} (${c.formato})`)
        .join("\n")}`,
    )
  }

  if (historico.length > 0) {
    const linhas = historico
      .map((h) => {
        const metr = h.metricas.map((m) => `${m.rotulo}: ${m.valor}`).join(", ")
        const resolvidos = h.resolvidos.length ? `Resolvido: ${h.resolvidos.join("; ")}.` : ""
        const novos = h.novosProblemas.length ? `A resolver: ${h.novosProblemas.join("; ")}.` : ""
        return `### ${h.referencia}\n${metr ? `Métricas: ${metr}.\n` : ""}${h.analise ? `${h.analise}\n` : ""}${resolvidos} ${novos}`.trim()
      })
      .join("\n\n")
    partes.push(`\n## HISTÓRICO DE EVOLUÇÃO (mais recente primeiro)\n${linhas}`)
  }

  const resumo: ResumoContexto = {
    nome: cliente.nome,
    segmento: cliente.segmento,
    status: cliente.status,
    desde: cliente.desde,
    objetivo: cliente.objetivo,
    blocos: [
      { rotulo: "Metas/KPIs", itens: metas.length },
      { rotulo: "Estratégia", itens: estrategia.estrategiaAtual.length },
      { rotulo: "Insights", itens: estrategia.insights.length },
      { rotulo: "Concorrentes", itens: estrategia.concorrentes.length },
      { rotulo: "Resultados", itens: resultados.length },
      { rotulo: "Conteúdos", itens: conteudos.length },
      { rotulo: "Evolução", itens: historico.length },
    ],
  }

  return { resumo, texto: partes.join("\n") }
}
