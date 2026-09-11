import "server-only"
import { createHash } from "node:crypto"
import { embedMany } from "ai"
import { query } from "@/lib/db"
import type { MidiaInstagram } from "@/lib/instagram-db"
import type { Reuniao } from "@/lib/reunioes-db"
import type { Experimento } from "@/lib/experimentos-db"
import type { ConteudoPerformance } from "@/lib/performance-db"
type ConteudoParaEmbedding = {
  id: string
  titulo?: string
  formato?: string
  status?: string
  dataISO?: string
  legenda?: string
  roteiro?: string
  direcionamento?: string
}

// Via AI Gateway (autenticado sem configuração no ambiente Vercel/v0).
const MODELO_EMBEDDING = "openai/text-embedding-3-small"
const LIMITE_DOCUMENTOS = 120
const LIMITE_DOCUMENTOS_INTERNOS = 200
const LIMITE_EVIDENCIAS = 8

// Fontes internas (reunião, experimento, performance, memória) são indexadas sob
// origem 'simple' com origem_id prefixado. Isso mantém a constraint atual da tabela
// (origem in 'instagram' | 'simple') e permite poda seletiva sem migração.
const PREFIXOS_INTERNOS = ["reuniao:", "experimento:", "performance:", "memoria:"] as const

export type DocumentoSemantico = {
  origem: "instagram" | "simple"
  origemId: string
  texto: string
  metadata: Record<string, unknown>
}

type DocumentoComHash = DocumentoSemantico & { hash: string }

type EmbeddingRow = {
  origem: "instagram" | "simple"
  origem_id: string
  conteudo_hash: string
}

type EvidenciaRow = {
  origem: "instagram" | "simple"
  origem_id: string
  texto: string
  metadata: Record<string, unknown>
  distancia: number
}

function hashDoTexto(texto: string): string {
  return createHash("sha256").update(texto).digest("hex")
}

function limparTexto(valor: string | null | undefined, limite = 1600): string {
  return (valor ?? "").replace(/\s+/g, " ").trim().slice(0, limite)
}

export type FontesSemanticas = {
  midias?: MidiaInstagram[]
  conteudos?: ConteudoParaEmbedding[]
  reunioes?: Reuniao[]
  experimentos?: Experimento[]
  performance?: ConteudoPerformance[]
  memoria?: { secao: string; conteudo: string }[]
}

function documentosInstagram(midias: MidiaInstagram[]): DocumentoSemantico[] {
  return midias.map((midia) => ({
    origem: "instagram" as const,
    origemId: midia.id,
    texto: [
      `Instagram ${midia.tipo}`,
      midia.publicadoEm ? `publicado em ${midia.publicadoEm.slice(0, 10)}` : "",
      limparTexto(midia.legenda),
      midia.alcance != null ? `alcance ${midia.alcance}` : "",
      midia.curtidas != null ? `curtidas ${midia.curtidas}` : "",
      midia.comentarios != null ? `comentários ${midia.comentarios}` : "",
      midia.salvamentos != null ? `salvamentos ${midia.salvamentos}` : "",
      midia.compartilhamentos != null ? `compartilhamentos ${midia.compartilhamentos}` : "",
    ].filter(Boolean).join(" | "),
    metadata: { tipo: midia.tipo, publicadoEm: midia.publicadoEm, permalink: midia.permalink },
  }))
}

function documentosConteudos(conteudos: ConteudoParaEmbedding[]): DocumentoSemantico[] {
  return conteudos.map((conteudo) => ({
    origem: "simple" as const,
    origemId: conteudo.id,
    texto: [
      `Conteúdo SIMPLE OS: ${limparTexto(conteudo.titulo, 240)}`,
      `formato ${conteudo.formato}`,
      `status ${conteudo.status}`,
      conteudo.dataISO ? `data ${conteudo.dataISO}` : "",
      limparTexto(conteudo.legenda),
      limparTexto(conteudo.roteiro),
      limparTexto(conteudo.direcionamento),
    ].filter(Boolean).join(" | "),
    metadata: { titulo: conteudo.titulo, formato: conteudo.formato, status: conteudo.status, data: conteudo.dataISO },
  }))
}

function documentosReunioes(reunioes: Reuniao[]): DocumentoSemantico[] {
  return reunioes.map((r) => ({
    origem: "simple" as const,
    origemId: `reuniao:${r.id}`,
    texto: [
      `Reunião: ${limparTexto(r.titulo, 200)}`,
      r.data ? `data ${r.data.slice(0, 10)}` : "",
      limparTexto(r.resumo),
      r.decisoes.length ? `decisões: ${limparTexto(r.decisoes.join("; "))}` : "",
      r.problemas.length ? `problemas: ${limparTexto(r.problemas.join("; "))}` : "",
      r.proximasAcoes.length ? `próximas ações: ${limparTexto(r.proximasAcoes.join("; "))}` : "",
      r.insights.length ? `insights: ${limparTexto(r.insights.join("; "))}` : "",
    ].filter(Boolean).join(" | "),
    metadata: { tipo: "reuniao", titulo: r.titulo, data: r.data },
  }))
}

function documentosExperimentos(experimentos: Experimento[]): DocumentoSemantico[] {
  return experimentos.map((e) => ({
    origem: "simple" as const,
    origemId: `experimento:${e.id}`,
    texto: [
      `Experimento: ${limparTexto(e.hipotese, 300)}`,
      e.oQueFoiTestado ? `testado: ${limparTexto(e.oQueFoiTestado)}` : "",
      e.resultado ? `resultado: ${limparTexto(e.resultado)}` : "",
      e.conclusao ? `conclusão: ${limparTexto(e.conclusao)}` : "",
      `status ${e.status}`,
    ].filter(Boolean).join(" | "),
    metadata: { tipo: "experimento", status: e.status },
  }))
}

function documentosPerformance(performance: ConteudoPerformance[]): DocumentoSemantico[] {
  return performance.map((p) => {
    const metricas = [
      p.views != null ? `views ${p.views}` : "",
      p.alcance != null ? `alcance ${p.alcance}` : "",
      p.curtidas != null ? `curtidas ${p.curtidas}` : "",
      p.comentarios != null ? `comentários ${p.comentarios}` : "",
      p.salvamentos != null ? `salvamentos ${p.salvamentos}` : "",
      p.compartilhamentos != null ? `compartilhamentos ${p.compartilhamentos}` : "",
      p.reposts != null ? `reposts ${p.reposts}` : "",
      p.visitasPerfil != null ? `visitas ao perfil ${p.visitasPerfil}` : "",
      p.seguidores != null ? `novos seguidores ${p.seguidores}` : "",
    ].filter(Boolean).join(", ")
    return {
      origem: "simple" as const,
      origemId: `performance:${p.id}`,
      texto: [
        `Performance de conteúdo: ${limparTexto(p.titulo, 200)}`,
        `formato ${p.formato}`,
        p.data ? `data ${p.data}` : "",
        p.gancho ? `gancho: ${limparTexto(p.gancho, 300)}` : "",
        p.objetivo ? `objetivo: ${limparTexto(p.objetivo, 300)}` : "",
        p.roteiro ? `roteiro: ${limparTexto(p.roteiro)}` : "",
        p.publico ? `público: ${limparTexto(p.publico, 300)}` : "",
        metricas ? `métricas: ${metricas}` : "",
        p.aprendizados.length ? `aprendizados: ${limparTexto(p.aprendizados.join("; "))}` : "",
      ].filter(Boolean).join(" | "),
      metadata: { tipo: "performance", formato: p.formato, data: p.data },
    }
  })
}

function documentosMemoria(memoria: { secao: string; conteudo: string }[]): DocumentoSemantico[] {
  return memoria.map((m) => ({
    origem: "simple" as const,
    origemId: `memoria:${m.secao}`,
    texto: `Memória (${m.secao}): ${limparTexto(m.conteudo)}`,
    metadata: { tipo: "memoria", secao: m.secao },
  }))
}

export function criarDocumentosSemanticos(fontes: FontesSemanticas): DocumentoSemantico[] {
  const externos = [
    ...documentosInstagram(fontes.midias ?? []),
    ...documentosConteudos(fontes.conteudos ?? []),
  ]
    .filter((documento) => documento.texto.length > 12)
    .slice(0, LIMITE_DOCUMENTOS)

  const internos = [
    ...documentosReunioes(fontes.reunioes ?? []),
    ...documentosExperimentos(fontes.experimentos ?? []),
    ...documentosPerformance(fontes.performance ?? []),
    ...documentosMemoria(fontes.memoria ?? []),
  ]
    .filter((documento) => documento.texto.length > 12)
    .slice(0, LIMITE_DOCUMENTOS_INTERNOS)

  return [...externos, ...internos]
}

function vetorComoParametro(vetor: number[]): string {
  return `[${vetor.join(",")}]`
}

export type EntradaIndexacao = { empresaId: string } & FontesSemanticas

async function podarInternosObsoletos(empresaId: string, idsPresentes: string[]): Promise<number> {
  const removidos = await query<{ origem_id: string }>(
    `delete from public.cliente_conteudo_embedding
      where empresa_id = $1
        and (origem_id like 'reuniao:%' or origem_id like 'experimento:%'
             or origem_id like 'performance:%' or origem_id like 'memoria:%')
        and not (origem_id = any($2::text[]))
      returning origem_id`,
    [empresaId, idsPresentes],
  )
  return removidos.length
}

export async function indexarAcervoSemantico(
  input: EntradaIndexacao,
  opcoes: { podarObsoletos?: boolean } = {},
): Promise<{ indexados: number; ignorados: number; removidos: number }> {
  const documentos: DocumentoComHash[] = criarDocumentosSemanticos(input)
    .map((documento) => ({ ...documento, hash: hashDoTexto(documento.texto) }))

  // A poda roda mesmo sem documentos novos: uma fonte interna esvaziada (todas as
  // reuniões excluídas, por exemplo) precisa remover as linhas obsoletas do acervo.
  let removidos = 0
  if (opcoes.podarObsoletos) {
    const idsInternos = documentos
      .map((documento) => documento.origemId)
      .filter((id) => PREFIXOS_INTERNOS.some((prefixo) => id.startsWith(prefixo)))
    removidos = await podarInternosObsoletos(input.empresaId, idsInternos)
  }

  if (documentos.length === 0) return { indexados: 0, ignorados: 0, removidos }

  const existentes = await query<EmbeddingRow>(
    `select origem, origem_id, conteudo_hash
       from public.cliente_conteudo_embedding
      where empresa_id = $1`,
    [input.empresaId],
  )
  const hashesAtuais = new Map(existentes.map((item) => [`${item.origem}:${item.origem_id}`, item.conteudo_hash]))
  const pendentes = documentos.filter((documento) => hashesAtuais.get(`${documento.origem}:${documento.origemId}`) !== documento.hash)
  if (pendentes.length === 0) return { indexados: 0, ignorados: documentos.length, removidos }

  const { embeddings } = await embedMany({
    model: MODELO_EMBEDDING,
    values: pendentes.map((documento) => documento.texto),
    maxParallelCalls: 2,
    maxRetries: 1,
  })
  for (const [indice, documento] of pendentes.entries()) {
    await query(
      `insert into public.cliente_conteudo_embedding
         (empresa_id, origem, origem_id, conteudo_hash, texto, metadata, embedding, atualizado_em)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::vector, now())
       on conflict (empresa_id, origem, origem_id) do update set
         conteudo_hash = excluded.conteudo_hash,
         texto = excluded.texto,
         metadata = excluded.metadata,
         embedding = excluded.embedding,
         atualizado_em = now()`,
      [input.empresaId, documento.origem, documento.origemId, documento.hash, documento.texto, JSON.stringify(documento.metadata), vetorComoParametro(embeddings[indice])],
    )
  }
  return { indexados: pendentes.length, ignorados: documentos.length - pendentes.length, removidos }
}

export async function buscarEvidenciasSemanticas(input: EntradaIndexacao & { consulta: string }): Promise<EvidenciaRow[]> {
  const consulta = limparTexto(input.consulta, 1200)
  if (!consulta) return []

  try {
    await indexarAcervoSemantico(input)
    const [consultaEmbedding] = (await embedMany({
      model: MODELO_EMBEDDING,
      values: [consulta],
      maxRetries: 1,
    })).embeddings

    return await query<EvidenciaRow>(
      `select origem, origem_id, texto, metadata,
              1 - (embedding <=> $2::vector) as distancia
         from public.cliente_conteudo_embedding
        where empresa_id = $1
        order by embedding <=> $2::vector
        limit ${LIMITE_EVIDENCIAS}`,
      [input.empresaId, vetorComoParametro(consultaEmbedding)],
    )
  } catch (error) {
    console.warn("[busca-semantica] fallback semântico ativado:", error instanceof Error ? error.message : error)
    return []
  }
}

export function formatarEvidenciasSemanticas(evidencias: EvidenciaRow[]): string {
  return evidencias
    .filter((evidencia) => evidencia.distancia >= 0.2)
    .map((evidencia, indice) => {
      const origem = evidencia.origem === "instagram" ? "Instagram" : "SIMPLE OS"
      const confianca = evidencia.distancia >= 0.75 ? "alta" : evidencia.distancia >= 0.5 ? "média" : "baixa"
      return `- [${indice + 1}] ${origem} | relevância ${evidencia.distancia.toFixed(2)} | confiança ${confianca} | ${evidencia.texto}`
    })
    .join("\n")
}
