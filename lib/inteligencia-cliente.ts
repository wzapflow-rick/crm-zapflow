import "server-only"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getConteudos } from "@/lib/clientes-db"
import { getMidiasInstagram, type MidiaInstagram } from "@/lib/instagram-db"
import { substituirPadroes, type ConfiancaPadrao } from "@/lib/padroes-db"

const MODELO = "gpt-4o"
const MAX_EVIDENCIAS_PARA_MODELO = 80

export type MetricaInteligencia = {
  total: number
  comAlcance: number
  alcanceTotal: number
  alcanceMedio: number | null
  curtidasTotal: number
  comentariosTotal: number
  salvamentosTotal: number
  compartilhamentosTotal: number
  visualizacoesTotal: number
  engajamentoMedio: number | null
}

export type ResumoInteligencia = {
  analisadoEm: string
  postsInstagram: number
  conteudosSIMPLE: number
  periodo: { inicio: string | null; fim: string | null }
  metricas: MetricaInteligencia
  porFormato: { formato: string; posts: number; alcanceMedio: number | null; engajamentoMedio: number | null }[]
  melhores: { id: string; formato: string; legenda: string; alcance: number | null; engajamento: number | null; data: string }[]
  recentes: { id: string; formato: string; legenda: string; alcance: number | null; engajamento: number | null; data: string }[]
  cobertura: string
}

type PadraoGerado = { categoria: string; padrao: string; evidencia: string; confianca: ConfiancaPadrao }

const schemaAprendizados = z.object({
  padroes: z.array(
    z.object({
      categoria: z.enum(["formato", "tema", "gancho", "legenda_cta", "periodo", "oportunidade"]),
      padrao: z.string().describe("Aprendizado específico e acionável para este cliente."),
      evidencia: z.string().describe("Números, período e amostra que sustentam o aprendizado."),
      confianca: z.enum(["alta", "media", "baixa"]),
    }),
  ).max(12),
})

function numero(valor: number | null | undefined): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0
}

function media(valores: number[]): number | null {
  return valores.length ? Number((valores.reduce((total, valor) => total + valor, 0) / valores.length).toFixed(2)) : null
}

function engajamento(post: MidiaInstagram): number | null {
  const base = post.alcance ?? post.impressoes ?? post.visualizacoes
  if (!base || base <= 0) return null
  const interacoes = numero(post.curtidas) + numero(post.comentarios) + numero(post.salvamentos) + numero(post.compartilhamentos)
  return Number(((interacoes / base) * 100).toFixed(2))
}

function dataValida(data: string): string | null {
  if (!data) return null
  const timestamp = Date.parse(data)
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString().slice(0, 10)
}

function evidencia(post: MidiaInstagram) {
  return {
    id: post.id,
    formato: post.tipo,
    legenda: post.legenda.trim().replace(/\s+/g, " ").slice(0, 180) || "(sem legenda)",
    alcance: post.alcance,
    engajamento: engajamento(post),
    data: dataValida(post.publicadoEm) ?? "sem data",
  }
}

export function analisarMidiasInstagram(midias: MidiaInstagram[]): ResumoInteligencia {
  const comAlcance = midias.filter((post) => (post.alcance ?? 0) > 0)
  const alcances = comAlcance.map((post) => numero(post.alcance))
  const metricas: MetricaInteligencia = {
    total: midias.length,
    comAlcance: comAlcance.length,
    alcanceTotal: alcances.reduce((total, valor) => total + valor, 0),
    alcanceMedio: media(alcances),
    curtidasTotal: midias.reduce((total, post) => total + numero(post.curtidas), 0),
    comentariosTotal: midias.reduce((total, post) => total + numero(post.comentarios), 0),
    salvamentosTotal: midias.reduce((total, post) => total + numero(post.salvamentos), 0),
    compartilhamentosTotal: midias.reduce((total, post) => total + numero(post.compartilhamentos), 0),
    visualizacoesTotal: midias.reduce((total, post) => total + numero(post.visualizacoes), 0),
    engajamentoMedio: media(midias.map(engajamento).filter((value): value is number => value != null)),
  }

  const formatos = [...new Set(midias.map((post) => post.tipo || "INDEFINIDO"))]
  const porFormato = formatos.map((formato) => {
    const posts = midias.filter((post) => (post.tipo || "INDEFINIDO") === formato)
    return {
      formato,
      posts: posts.length,
      alcanceMedio: media(posts.map((post) => post.alcance).filter((value): value is number => value != null)),
      engajamentoMedio: media(posts.map(engajamento).filter((value): value is number => value != null)),
    }
  }).sort((a, b) => (b.alcanceMedio ?? 0) - (a.alcanceMedio ?? 0))

  const ordenadas = [...midias].sort((a, b) => (b.alcance ?? 0) - (a.alcance ?? 0))
  const recentes = [...midias]
    .sort((a, b) => (Date.parse(b.publicadoEm) || 0) - (Date.parse(a.publicadoEm) || 0))
    .slice(0, 20)
    .map(evidencia)
  const datas = midias.map((post) => dataValida(post.publicadoEm)).filter((value): value is string => value != null).sort()

  return {
    analisadoEm: new Date().toISOString(),
    postsInstagram: midias.length,
    conteudosSIMPLE: 0,
    periodo: { inicio: datas[0] ?? null, fim: datas.at(-1) ?? null },
    metricas,
    porFormato,
    melhores: ordenadas.slice(0, 20).map(evidencia),
    recentes,
    cobertura: `${comAlcance.length} de ${midias.length} posts possuem alcance; ${midias.filter((post) => engajamento(post) != null).length} possuem base para taxa de engajamento.`,
  }
}

function montarEvidencias(conteudos: Awaited<ReturnType<typeof getConteudos>>, resumo: ResumoInteligencia) {
  const posts = [...resumo.melhores, ...resumo.recentes]
  const conteudosSIMPLE = conteudos.slice(0, 30).map((conteudo) => ({
    id: conteudo.id,
    formato: conteudo.formato,
    status: conteudo.status,
    titulo: conteudo.titulo,
    roteiro: conteudo.roteiro?.slice(0, 300) ?? "",
    legenda: conteudo.legenda?.slice(0, 300) ?? "",
  }))
  return { posts: posts.slice(0, MAX_EVIDENCIAS_PARA_MODELO), conteudosSIMPLE }
}

const execucoes = new Map<string, Promise<void>>()

export async function atualizarInteligenciaCliente(empresaId: string): Promise<void> {
  const id = empresaId.trim()
  if (!id) return
  const anterior = execucoes.get(id)
  if (anterior) return anterior

  const execucao = (async () => {
    const [midias, conteudos] = await Promise.all([getMidiasInstagram(id), getConteudos(id)])
    const resumo = analisarMidiasInstagram(midias)
    resumo.conteudosSIMPLE = conteudos.length
    const payload = montarEvidencias(conteudos, resumo)

    if (midias.length === 0 && conteudos.length === 0) {
      await substituirPadroes(id, [])
      return
    }

    const { object } = await generateObject({
      model: openai(MODELO),
      schema: schemaAprendizados,
      system: `Você é a camada de análise factual do SIMPLE OS. Gere aprendizados somente com os dados recebidos do cliente atual. Nunca invente números, datas, causalidade ou conversões. Se a amostra for pequena, use confiança baixa ou média e diga isso na evidência. Diferencie correlação de causalidade. Priorize métricas observadas do Instagram e conteúdos cadastrados no SIMPLE OS. Responda em português do Brasil, com recomendações específicas e auditáveis.`,
      prompt: JSON.stringify({ clienteId: id, resumo, evidencias: payload }),
    })

    await substituirPadroes(id, object.padroes as PadraoGerado[])
  })()

  execucoes.set(id, execucao)
  try {
    await execucao
  } finally {
    if (execucoes.get(id) === execucao) execucoes.delete(id)
  }
}

export function formatarResumoInteligencia(resumo: ResumoInteligencia): string {
  const metricas = resumo.metricas
  const formato = resumo.porFormato.map((item) => `${item.formato}: ${item.posts} posts, alcance médio ${item.alcanceMedio ?? "sem dados"}, engajamento médio ${item.engajamentoMedio != null ? `${item.engajamentoMedio}%` : "sem dados"}`).join(" | ")
  return [`Posts Instagram analisados: ${resumo.postsInstagram}. Conteúdos SIMPLE OS: ${resumo.conteudosSIMPLE}.`, `Período: ${resumo.periodo.inicio ?? "sem início"} a ${resumo.periodo.fim ?? "sem fim"}.`, `Alcance total: ${metricas.alcanceTotal}; alcance médio: ${metricas.alcanceMedio ?? "sem dados"}; curtidas: ${metricas.curtidasTotal}; comentários: ${metricas.comentariosTotal}; salvamentos: ${metricas.salvamentosTotal}; compartilhamentos: ${metricas.compartilhamentosTotal}; visualizações: ${metricas.visualizacoesTotal}.`, `Engajamento médio calculável: ${metricas.engajamentoMedio != null ? `${metricas.engajamentoMedio}%` : "sem dados"}. ${resumo.cobertura}`, formato ? `Por formato: ${formato}.` : ""].filter(Boolean).join("\n")
}

export function selecionarEvidenciasInstagram(midias: MidiaInstagram[], limite = 24): string {
  return [...midias]
    .sort((a, b) => (b.alcance ?? 0) - (a.alcance ?? 0))
    .slice(0, limite)
    .map((post) => {
      const data = dataValida(post.publicadoEm) ?? "sem data"
      const metricas = [`alcance=${post.alcance ?? "n/d"}`, `curtidas=${post.curtidas ?? "n/d"}`, `comentários=${post.comentarios ?? "n/d"}`, `salvamentos=${post.salvamentos ?? "n/d"}`, `compartilhamentos=${post.compartilhamentos ?? "n/d"}`, `engajamento=${engajamento(post) != null ? `${engajamento(post)}%` : "n/d"}`].join(", ")
      return `- id=${post.id} | ${data} | ${post.tipo} | ${post.legenda.trim().replace(/\s+/g, " ").slice(0, 180) || "(sem legenda)"} | ${metricas}${post.permalink ? ` | ${post.permalink}` : ""}`
    })
    .join("\n")
}

export function resumoVazioInteligencia(): ResumoInteligencia {
  return analisarMidiasInstagram([])
}
