import "server-only"
import { createHash } from "node:crypto"
import { embedMany, gateway } from "ai"
import { query } from "@/lib/db"
import type { MidiaInstagram } from "@/lib/instagram-db"
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

const MODELO_EMBEDDING = "openai/text-embedding-3-small"
const LIMITE_DOCUMENTOS = 120
const LIMITE_EVIDENCIAS = 8

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

export function criarDocumentosSemanticos(midias: MidiaInstagram[], conteudos: ConteudoParaEmbedding[]): DocumentoSemantico[] {
  const instagram = midias.map((midia) => {
    const texto = [
      `Instagram ${midia.tipo}`,
      midia.publicadoEm ? `publicado em ${midia.publicadoEm.slice(0, 10)}` : "",
      limparTexto(midia.legenda),
      midia.alcance != null ? `alcance ${midia.alcance}` : "",
      midia.curtidas != null ? `curtidas ${midia.curtidas}` : "",
      midia.comentarios != null ? `comentários ${midia.comentarios}` : "",
      midia.salvamentos != null ? `salvamentos ${midia.salvamentos}` : "",
      midia.compartilhamentos != null ? `compartilhamentos ${midia.compartilhamentos}` : "",
    ].filter(Boolean).join(" | ")
    return {
      origem: "instagram" as const,
      origemId: midia.id,
      texto,
      metadata: { tipo: midia.tipo, publicadoEm: midia.publicadoEm, permalink: midia.permalink },
    }
  })

  const simple = conteudos.map((conteudo) => ({
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

  return [...instagram, ...simple]
    .filter((documento) => documento.texto.length > 12)
    .slice(0, LIMITE_DOCUMENTOS)
}

function vetorComoParametro(vetor: number[]): string {
  return `[${vetor.join(",")}]`
}

type EntradaIndexacao = {
  empresaId: string
  midias: MidiaInstagram[]
  conteudos: ConteudoParaEmbedding[]
}

export async function indexarAcervoSemantico(input: EntradaIndexacao): Promise<{ indexados: number; ignorados: number }> {
  const documentos: DocumentoComHash[] = criarDocumentosSemanticos(input.midias, input.conteudos)
    .map((documento) => ({ ...documento, hash: hashDoTexto(documento.texto) }))
  if (documentos.length === 0) return { indexados: 0, ignorados: 0 }

  const existentes = await query<EmbeddingRow>(
    `select origem, origem_id, conteudo_hash
       from public.cliente_conteudo_embedding
      where empresa_id = $1`,
    [input.empresaId],
  )
  const hashesAtuais = new Map(existentes.map((item) => [`${item.origem}:${item.origem_id}`, item.conteudo_hash]))
  const pendentes = documentos.filter((documento) => hashesAtuais.get(`${documento.origem}:${documento.origemId}`) !== documento.hash)
  if (pendentes.length === 0) return { indexados: 0, ignorados: documentos.length }

  const { embeddings } = await embedMany({
    model: gateway.embeddingModel(MODELO_EMBEDDING),
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
  return { indexados: pendentes.length, ignorados: documentos.length - pendentes.length }
}

export async function buscarEvidenciasSemanticas(input: EntradaIndexacao & { consulta: string }): Promise<EvidenciaRow[]> {
  const consulta = limparTexto(input.consulta, 1200)
  if (!consulta) return []

  try {
    await indexarAcervoSemantico(input)
    const [consultaEmbedding] = (await embedMany({
      model: gateway.embeddingModel(MODELO_EMBEDDING),
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
