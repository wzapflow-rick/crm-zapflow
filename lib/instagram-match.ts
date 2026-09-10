import type { MidiaInstagram } from "@/lib/instagram-db"
import type { ConteudoPerformance } from "@/lib/performance-db"

// Casamento entre um conteúdo do pipeline SIMPLE e um post real do Instagram.
// A ideia é achar, automaticamente, qual post publicado corresponde a cada
// conteúdo — por proximidade de data e semelhança entre o título/roteiro/legenda
// interna e a legenda do post. Assim as métricas entram sozinhas, sem digitação.

export type ConteudoParaMatch = {
  id: string
  titulo: string
  formato: string
  dataISO?: string
  roteiro?: string
  legenda?: string
}

export type NivelConfianca = "alta" | "media" | "baixa"

// Métricas do post no formato usado pela tabela de performance.
export type MetricasPost = {
  views: number | null
  alcance: number | null
  curtidas: number | null
  comentarios: number | null
  salvamentos: number | null
  compartilhamentos: number | null
}

const STOPWORDS = new Set([
  "a", "o", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "e", "ou", "que",
  "com", "sem", "por", "para", "pra", "no", "na", "nos", "nas", "em", "ao", "aos", "se", "seu", "sua",
  "seus", "suas", "meu", "minha", "isso", "isto", "esse", "essa", "este", "esta", "the", "of", "to",
  "voce", "vc", "mais", "menos", "muito", "ja", "sao", "ser", "tem", "vai", "foi", "como", "quando",
])

// Remove acentos, pontuação, emojis e normaliza para tokens comparáveis.
function tokenizar(texto: string): Set<string> {
  const limpo = (texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const tokens = limpo
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  return new Set(tokens)
}

// Similaridade textual robusta para títulos curtos vs. legendas longas:
// combina Jaccard (interseção/união) com "containment" (quanto do texto menor
// aparece no maior). Retorna 0..1.
function similaridadeTexto(a: string, b: string): number {
  const setA = tokenizar(a)
  const setB = tokenizar(b)
  if (setA.size === 0 || setB.size === 0) return 0
  let intersecao = 0
  for (const t of setA) if (setB.has(t)) intersecao++
  const uniao = setA.size + setB.size - intersecao
  const jaccard = uniao === 0 ? 0 : intersecao / uniao
  const menor = Math.min(setA.size, setB.size)
  const containment = menor === 0 ? 0 : intersecao / menor
  return Math.max(jaccard, containment)
}

function diaDe(iso: string): number | null {
  if (!iso) return null
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return null
  return Math.floor(ts / 86_400_000)
}

// Proximidade de datas → 0..1 (mesmo dia = 1; vai caindo conforme afasta).
function proximidadeData(conteudoISO: string | undefined, postISO: string): number | null {
  const d1 = conteudoISO ? diaDe(conteudoISO) : null
  const d2 = diaDe(postISO)
  if (d1 == null || d2 == null) return null
  const diff = Math.abs(d1 - d2)
  if (diff === 0) return 1
  if (diff <= 1) return 0.9
  if (diff <= 3) return 0.7
  if (diff <= 7) return 0.45
  if (diff <= 14) return 0.25
  return 0.05
}

// Mapeia o tipo de mídia do Instagram para os formatos internos da SIMPLE.
export function mapearFormatoInstagram(tipo: string): string {
  const t = (tipo || "").toUpperCase()
  if (t.includes("REEL") || t === "VIDEO") return "Reels"
  if (t.includes("CAROUSEL") || t.includes("ALBUM")) return "Carrossel"
  if (t.includes("STORY")) return "Story"
  if (t === "IMAGE") return "Estático"
  return "Reels"
}

export function metricasDaMidia(m: MidiaInstagram): MetricasPost {
  return {
    views: m.visualizacoes,
    alcance: m.alcance,
    curtidas: m.curtidas,
    comentarios: m.comentarios,
    salvamentos: m.salvamentos,
    compartilhamentos: m.compartilhamentos,
  }
}

function confiancaDe(score: number): NivelConfianca {
  if (score >= 0.6) return "alta"
  if (score >= 0.35) return "media"
  return "baixa"
}

export type Correspondencia = {
  midia: MidiaInstagram
  score: number
  confianca: NivelConfianca
}

// Pontua e ranqueia os posts do Instagram para um conteúdo do pipeline.
export function melhoresCorrespondencias(
  conteudo: ConteudoParaMatch,
  midias: MidiaInstagram[],
  limite = 4,
): Correspondencia[] {
  const alvoTexto = [conteudo.titulo, conteudo.roteiro ?? "", conteudo.legenda ?? ""].join(" ")
  const formatoAlvo = conteudo.formato

  const ranqueadas = midias.map((midia) => {
    const texto = similaridadeTexto(alvoTexto, midia.legenda)
    const data = proximidadeData(conteudo.dataISO, midia.publicadoEm)
    // Sem data no conteúdo → confia só no texto. Com data → média ponderada.
    let score = data == null ? texto : texto * 0.5 + data * 0.5
    if (mapearFormatoInstagram(midia.tipo) === formatoAlvo) score = Math.min(1, score + 0.1)
    return { midia, score: Number(score.toFixed(3)), confianca: confiancaDe(score) }
  })

  return ranqueadas.sort((a, b) => b.score - a.score).slice(0, limite)
}

// Heurística de deduplicação: um post provavelmente já foi importado se existe
// uma performance com data próxima (±1 dia) e título parecido com a legenda.
export function jaImportado(midia: MidiaInstagram, performances: ConteudoPerformance[]): boolean {
  const diaPost = diaDe(midia.publicadoEm)
  return performances.some((p) => {
    const diaPerf = p.data ? diaDe(p.data) : null
    const dataOk = diaPost != null && diaPerf != null && Math.abs(diaPost - diaPerf) <= 1
    const textoOk = similaridadeTexto(p.titulo + " " + (p.roteiro ?? ""), midia.legenda) >= 0.5
    return dataOk && textoOk
  })
}
