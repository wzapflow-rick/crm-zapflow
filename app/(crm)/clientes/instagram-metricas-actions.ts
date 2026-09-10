"use server"

import { revalidatePath } from "next/cache"
import { getMidiasInstagram, type MidiaInstagram } from "@/lib/instagram-db"
import { getPerformance, inserirPerformance } from "@/lib/performance-db"
import { agendarAtualizacaoInteligencia } from "@/lib/atualizacao-inteligencia"
import { gerarAprendizadosConteudo } from "@/lib/aprendizados-conteudo"
import {
  melhoresCorrespondencias,
  metricasDaMidia,
  mapearFormatoInstagram,
  jaImportado,
  type ConteudoParaMatch,
  type NivelConfianca,
} from "@/lib/instagram-match"

// Post do Instagram já preparado para exibição/importação no cliente.
export type CandidatoMetrica = {
  mediaId: string
  tipo: string
  formato: string
  legenda: string
  permalink: string
  thumbnailUrl: string
  publicadoEm: string
  score: number
  confianca: NivelConfianca
  jaImportado: boolean
  metricas: {
    views: number | null
    alcance: number | null
    curtidas: number | null
    comentarios: number | null
    salvamentos: number | null
    compartilhamentos: number | null
  }
}

function paraCandidato(
  midia: MidiaInstagram,
  extra: { score: number; confianca: NivelConfianca; jaImportado: boolean },
): CandidatoMetrica {
  return {
    mediaId: midia.id,
    tipo: midia.tipo,
    formato: mapearFormatoInstagram(midia.tipo),
    legenda: midia.legenda,
    permalink: midia.permalink,
    thumbnailUrl: midia.thumbnailUrl,
    publicadoEm: midia.publicadoEm,
    score: extra.score,
    confianca: extra.confianca,
    jaImportado: extra.jaImportado,
    metricas: metricasDaMidia(midia),
  }
}

// Sugere os posts do Instagram mais prováveis para um conteúdo do pipeline.
export async function sugerirMetricasAction(
  clienteId: string,
  conteudo: ConteudoParaMatch,
): Promise<{ temInstagram: boolean; candidatos: CandidatoMetrica[] }> {
  const id = clienteId.trim()
  if (!id) return { temInstagram: false, candidatos: [] }

  const [midias, performances] = await Promise.all([
    getMidiasInstagram(id).catch(() => []),
    getPerformance(id).catch(() => []),
  ])
  if (midias.length === 0) return { temInstagram: false, candidatos: [] }

  const correspondencias = melhoresCorrespondencias(conteudo, midias, 4)
  const candidatos = correspondencias.map((c) =>
    paraCandidato(c.midia, {
      score: c.score,
      confianca: c.confianca,
      jaImportado: jaImportado(c.midia, performances),
    }),
  )
  return { temInstagram: true, candidatos }
}

// Lista os posts do Instagram (mais recentes) para importação avulsa, marcando
// os que já parecem ter sido vinculados a uma performance.
export async function listarPostsImportaveisAction(
  clienteId: string,
): Promise<{ temInstagram: boolean; posts: CandidatoMetrica[] }> {
  const id = clienteId.trim()
  if (!id) return { temInstagram: false, posts: [] }

  const [midias, performances] = await Promise.all([
    getMidiasInstagram(id).catch(() => []),
    getPerformance(id).catch(() => []),
  ])
  if (midias.length === 0) return { temInstagram: false, posts: [] }

  const posts = [...midias]
    .sort((a, b) => (Date.parse(b.publicadoEm) || 0) - (Date.parse(a.publicadoEm) || 0))
    .slice(0, 40)
    .map((m) => paraCandidato(m, { score: 0, confianca: "media", jaImportado: jaImportado(m, performances) }))
  return { temInstagram: true, posts }
}

function primeiraLinha(legenda: string): string {
  const linha = (legenda || "").split("\n").map((l) => l.trim()).find(Boolean) ?? ""
  return linha.slice(0, 120)
}

export type ResultadoImportacao = { ok: boolean; erro?: string }

// Importa as métricas reais de um post do Instagram para a performance do
// cliente, gerando os aprendizados da IA. É o único caminho de registro de
// métricas (substitui o preenchimento manual).
export async function importarMidiaAction(
  clienteId: string,
  mediaId: string,
  contexto: { titulo?: string; formato?: string; roteiro?: string; objetivo?: string; publico?: string } = {},
): Promise<ResultadoImportacao> {
  const id = clienteId.trim()
  const mId = mediaId.trim()
  if (!id || !mId) return { ok: false, erro: "Post não identificado." }

  const midias = await getMidiasInstagram(id).catch(() => [])
  const midia = midias.find((m) => m.id === mId)
  if (!midia) return { ok: false, erro: "Post não encontrado. Sincronize o Instagram e tente de novo." }

  const metricas = metricasDaMidia(midia)
  const dataISO = midia.publicadoEm ? new Date(midia.publicadoEm).toISOString().slice(0, 10) : ""
  const titulo = (contexto.titulo ?? "").trim() || primeiraLinha(midia.legenda) || "Conteúdo publicado"
  const formato = (contexto.formato ?? "").trim() || mapearFormatoInstagram(midia.tipo)
  const roteiro = (contexto.roteiro ?? "").trim() || midia.legenda.trim()

  const aprendizados = await gerarAprendizadosConteudo({
    titulo,
    formato,
    objetivo: contexto.objetivo,
    roteiro,
    publico: contexto.publico,
    ...metricas,
  })

  try {
    await inserirPerformance(id, {
      titulo,
      formato,
      data: dataISO,
      objetivo: contexto.objetivo,
      roteiro,
      publico: contexto.publico,
      views: metricas.views,
      curtidas: metricas.curtidas,
      comentarios: metricas.comentarios,
      salvamentos: metricas.salvamentos,
      compartilhamentos: metricas.compartilhamentos,
      alcance: metricas.alcance,
      aprendizados,
    })
  } catch (e) {
    console.error("[v0] Erro ao importar métricas do Instagram:", e)
    return { ok: false, erro: "Não foi possível salvar as métricas. Tente novamente." }
  }

  agendarAtualizacaoInteligencia(id)
  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}
