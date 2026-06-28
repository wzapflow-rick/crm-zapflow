import "server-only"
import { getClientePorId, getMetas, getEstrategia, getConteudos, getResultados } from "@/lib/clientes-db"
import { getHistorico } from "@/lib/historico-db"
import { getMemoria } from "@/lib/memoria-db"
import { SECOES_MEMORIA } from "@/lib/memoria-secoes"
import { getReunioes } from "@/lib/reunioes-db"
import { getPerformance } from "@/lib/performance-db"

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

  const [metas, estrategia, conteudos, resultados, historico, memoria, reunioes] = await Promise.all([
    getMetas(empresaId).catch(() => []),
    getEstrategia(empresaId).catch(() => ({ estrategiaAtual: [], insights: [], concorrentes: [] })),
    getConteudos(empresaId).catch(() => []),
    getResultados(empresaId).catch(() => []),
    getHistorico(empresaId).catch(() => []),
    getMemoria(empresaId).catch(() => ({}) as Record<string, string>),
    getReunioes(empresaId).catch(() => []),
  ])

  const performance = await getPerformance(empresaId).catch(() => [])

  const partes: string[] = []

  partes.push(`## CLIENTE: ${cliente.nome}`)
  partes.push(
    `Segmento: ${cliente.segmento} | Status: ${cliente.status} | Cliente desde: ${cliente.desde} | Modelo: ${cliente.recorrente ? "recorrente" : "avulso"}`,
  )
  if (cliente.objetivo) partes.push(`Objetivo principal: ${cliente.objetivo}`)
  if (cliente.resumoEstrategico) partes.push(`Resumo estratégico: ${cliente.resumoEstrategico}`)

  // Client Memory (seções editáveis preenchidas pela equipe).
  const secoesPreenchidas = SECOES_MEMORIA.filter((s) => (memoria[s.id] ?? "").trim())
  if (secoesPreenchidas.length > 0) {
    partes.push(
      `\n## MEMÓRIA DO CLIENTE\n${secoesPreenchidas
        .map((s) => `### ${s.titulo}\n${memoria[s.id].trim()}`)
        .join("\n\n")}`,
    )
  }

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

  if (reunioes.length > 0) {
    const linhas = reunioes
      .slice(0, 12)
      .map((r) => {
        const data = new Date(r.data).toLocaleDateString("pt-BR")
        const decisoes = r.decisoes.length ? `Decisões: ${r.decisoes.join("; ")}.` : ""
        const problemas = r.problemas.length ? `Problemas: ${r.problemas.join("; ")}.` : ""
        const acoes = r.proximasAcoes.length ? `Próximas ações: ${r.proximasAcoes.join("; ")}.` : ""
        const insights = r.insights.length ? `Insights: ${r.insights.join("; ")}.` : ""
        return `### ${r.titulo} (${data})\n${r.resumo ? `${r.resumo}\n` : ""}${[decisoes, problemas, acoes, insights]
          .filter(Boolean)
          .join(" ")}`.trim()
      })
      .join("\n\n")
    partes.push(`\n## REUNIÕES (mais recente primeiro)\n${linhas}`)
  }

  if (performance.length > 0) {
    const linhas = performance
      .slice(0, 20)
      .map((p) => {
        const metr = [
          p.views != null ? `${p.views} views` : "",
          p.alcance != null ? `${p.alcance} alcance` : "",
          p.curtidas != null ? `${p.curtidas} curtidas` : "",
          p.comentarios != null ? `${p.comentarios} comentários` : "",
          p.salvamentos != null ? `${p.salvamentos} salvamentos` : "",
          p.compartilhamentos != null ? `${p.compartilhamentos} compart.` : "",
        ]
          .filter(Boolean)
          .join(", ")
        const apr = p.aprendizados.length ? ` Aprendizados: ${p.aprendizados.join("; ")}.` : ""
        const obj = p.objetivo ? ` Objetivo: ${p.objetivo}.` : ""
        const gancho = p.gancho ? ` Gancho: ${p.gancho}.` : ""
        return `- [${p.formato}] ${p.titulo}${metr ? ` — ${metr}.` : "."}${gancho}${obj}${apr}`
      })
      .join("\n")
    partes.push(`\n## PERFORMANCE DE CONTEÚDO (mais recente primeiro)\n${linhas}`)
  }

  const resumo: ResumoContexto = {
    nome: cliente.nome,
    segmento: cliente.segmento,
    status: cliente.status,
    desde: cliente.desde,
    objetivo: cliente.objetivo,
    blocos: [
      { rotulo: "Memória", itens: secoesPreenchidas.length },
      { rotulo: "Metas/KPIs", itens: metas.length },
      { rotulo: "Estratégia", itens: estrategia.estrategiaAtual.length },
      { rotulo: "Insights", itens: estrategia.insights.length },
      { rotulo: "Concorrentes", itens: estrategia.concorrentes.length },
      { rotulo: "Resultados", itens: resultados.length },
      { rotulo: "Conteúdos", itens: conteudos.length },
      { rotulo: "Evolução", itens: historico.length },
      { rotulo: "Reuniões", itens: reunioes.length },
      { rotulo: "Performance", itens: performance.length },
    ],
  }

  return { resumo, texto: partes.join("\n") }
}
