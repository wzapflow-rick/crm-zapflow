import "server-only"
import type { PerfilInstagram } from "@/lib/instagram-api"

// Cliente da Graph API do Instagram usado pela sincronização (manual e diária).
// Regras: o token nunca aparece em mensagens de erro nem em logs; os links
// `paging.next` da Meta (que embutem o token) não são reutilizados — a
// paginação usa só o cursor `after`.

export const API_VERSION = "v23.0"
const GRAPH = "https://graph.instagram.com"
export const MAX_NOVAS_TENTATIVAS = 2
const TIMEOUT_PADRAO_MS = 20_000
const LIMITE_USO_PERCENTUAL = 90

export type TipoErroMeta = "reconectar" | "limite" | "temporario" | "permanente"

export const MENSAGENS_ERRO: Record<TipoErroMeta, string> = {
  reconectar: "O acesso ao Instagram expirou ou foi revogado. Reconecte a conta.",
  limite: "A Meta limitou as chamadas desta conta. A coleta continua na próxima execução.",
  temporario: "Instabilidade temporária na Meta. A coleta será tentada novamente.",
  permanente: "A Meta recusou a solicitação.",
}

export class ErroMeta extends Error {
  readonly tipo: TipoErroMeta
  readonly codigo: string
  constructor(tipo: TipoErroMeta, codigo: string, mensagem = MENSAGENS_ERRO[tipo]) {
    super(mensagem)
    this.name = "ErroMeta"
    this.tipo = tipo
    this.codigo = codigo
  }
}

export class OrcamentoEsgotado extends Error {
  constructor() {
    super("Limite de chamadas desta execução atingido.")
    this.name = "OrcamentoEsgotado"
  }
}

type ErroGraph = { code?: number; error_subcode?: number; is_transient?: boolean }

const CODIGOS_LIMITE = new Set([4, 17, 32, 613])
const CODIGOS_TEMPORARIOS = new Set([1, 2])

export function classificarErroMeta(http: number, erro?: ErroGraph | null): ErroMeta {
  const code = typeof erro?.code === "number" ? erro.code : null
  const codigo = code !== null ? `meta_${code}` : `http_${http}`
  if (code === 190 || code === 10 || (code !== null && code >= 200 && code <= 299)) {
    return new ErroMeta("reconectar", codigo)
  }
  if ((code !== null && CODIGOS_LIMITE.has(code)) || http === 429) return new ErroMeta("limite", codigo)
  if (erro?.is_transient === true || (code !== null && CODIGOS_TEMPORARIOS.has(code)) || http >= 500) {
    return new ErroMeta("temporario", codigo)
  }
  if (code === null && http === 401) return new ErroMeta("reconectar", codigo)
  return new ErroMeta("permanente", codigo)
}

// Erros que encerram a coleta da conta (não só do post).
export function erroFatalDaConta(e: unknown): boolean {
  if (e instanceof OrcamentoEsgotado) return true
  if (!(e instanceof ErroMeta)) return false
  return e.tipo === "limite" || (e.tipo === "reconectar" && e.codigo === "meta_190")
}

// Maior percentual de uso informado nos cabeçalhos de limite da Meta.
export function percentualUso(headers: Headers): number {
  let maior = 0
  const visitar = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visitar)
    else if (v && typeof v === "object") {
      for (const [chave, valor] of Object.entries(v)) {
        if (["call_count", "total_cputime", "total_time"].includes(chave) && typeof valor === "number") {
          maior = Math.max(maior, valor)
        } else visitar(valor)
      }
    }
  }
  for (const nome of ["x-business-use-case-usage", "x-app-usage"]) {
    const bruto = headers.get(nome)
    if (!bruto) continue
    try {
      visitar(JSON.parse(bruto))
    } catch {
      // cabeçalho malformado: ignora
    }
  }
  return maior
}

export type CampoMetrica =
  | "alcance"
  | "salvamentos"
  | "compartilhamentos"
  | "visualizacoes"
  | "curtidas"
  | "comentarios"
  | "visitasPerfil"
  | "seguidores"
  | "reposts"

const CAMPO_DA_METRICA: Record<string, CampoMetrica> = {
  reach: "alcance",
  saved: "salvamentos",
  shares: "compartilhamentos",
  views: "visualizacoes",
  likes: "curtidas",
  comments: "comentarios",
  profile_visits: "visitasPerfil",
  follows: "seguidores",
  reposts: "reposts",
}

export type ValoresMetricas = Partial<Record<CampoMetrica, number | null>>
export type StatusMetricas = "ok" | "parcial" | "indisponivel" | "erro"
export type ResultadoInsights = { status: StatusMetricas; valores: ValoresMetricas }

export type MidiaBase = {
  id: string
  tipo: string
  legenda: string
  permalink: string
  thumbnailUrl: string
  mediaUrl: string
  publicadoEm: string | null
  curtidas: number | null
  comentarios: number | null
}

type MetricaGraph = { name: string; values?: { value?: unknown }[]; total_value?: { value?: unknown } }

function valorMetrica(m: MetricaGraph): number | null {
  const v = m.values?.[0]?.value ?? m.total_value?.value
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

type MediaApiItem = {
  id: string
  caption?: string
  media_type?: string
  media_product_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
  like_count?: number
  comments_count?: number
}

function converterMidia(item: MediaApiItem): MidiaBase {
  return {
    id: String(item.id),
    tipo: item.media_product_type === "REELS" ? "REELS" : item.media_type ?? "IMAGE",
    legenda: item.caption ?? "",
    permalink: item.permalink ?? "",
    thumbnailUrl: item.thumbnail_url ?? item.media_url ?? "",
    mediaUrl: item.media_url ?? "",
    publicadoEm: item.timestamp ?? null,
    curtidas: typeof item.like_count === "number" ? item.like_count : null,
    comentarios: typeof item.comments_count === "number" ? item.comments_count : null,
  }
}

export type ClienteGraph = {
  perfil(): Promise<PerfilInstagram>
  paginaMidias(after: string | null): Promise<{ itens: MidiaBase[]; proximo: string | null }>
  insights(mediaId: string, tipo: string): Promise<ResultadoInsights>
  renovarToken(): Promise<{ accessToken: string; expiresIn: number }>
  trocarToken(novo: string): void
  chamadas(): number
  proximoDoLimite(): boolean
}

export type OpcoesClienteGraph = {
  token: string
  maxChamadas: number
  fetchImpl?: typeof fetch
  esperar?: (ms: number) => Promise<void>
  timeoutMs?: number
}

const esperarPadrao = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function criarClienteGraph(opcoes: OpcoesClienteGraph): ClienteGraph {
  const fetchImpl = opcoes.fetchImpl ?? fetch
  const esperar = opcoes.esperar ?? esperarPadrao
  const timeoutMs = opcoes.timeoutMs ?? TIMEOUT_PADRAO_MS
  let token = opcoes.token
  let chamadas = 0
  let usoMaximo = 0

  async function get<T>(caminho: string, params: Record<string, string>): Promise<T> {
    for (let tentativa = 0; ; tentativa += 1) {
      if (chamadas >= opcoes.maxChamadas) throw new OrcamentoEsgotado()
      chamadas += 1
      const url = new URL(`${GRAPH}/${caminho}`)
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
      url.searchParams.set("access_token", token)

      let erro: ErroMeta
      try {
        const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" })
        usoMaximo = Math.max(usoMaximo, percentualUso(res.headers))
        const json = (await res.json().catch(() => ({}))) as T & { error?: ErroGraph }
        if (res.ok && !json?.error) return json
        erro = classificarErroMeta(res.status, json?.error)
      } catch (e) {
        if (e instanceof ErroMeta) throw e
        erro = new ErroMeta("temporario", "rede", "Falha de rede ao falar com a Meta.")
      }
      if (erro.tipo === "temporario" && tentativa < MAX_NOVAS_TENTATIVAS) {
        await esperar(500 * 2 ** tentativa)
        continue
      }
      throw erro
    }
  }

  async function pedirMetricas(mediaId: string, nomes: string[]): Promise<ValoresMetricas> {
    const json = await get<{ data?: MetricaGraph[] }>(`${API_VERSION}/${mediaId}/insights`, {
      metric: nomes.join(","),
    })
    const valores: ValoresMetricas = {}
    for (const nome of nomes) valores[CAMPO_DA_METRICA[nome]] = null
    for (const m of json.data ?? []) {
      const campo = CAMPO_DA_METRICA[m.name]
      if (campo) valores[campo] = valorMetrica(m)
    }
    return valores
  }

  return {
    async perfil() {
      const json = await get<Record<string, unknown>>(`${API_VERSION}/me`, {
        fields: "user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
      })
      return {
        igUserId: String(json.user_id ?? json.id ?? ""),
        username: String(json.username ?? ""),
        nome: (json.name as string) ?? null,
        accountType: (json.account_type as string) ?? null,
        profilePictureUrl: (json.profile_picture_url as string) ?? null,
        seguidores: typeof json.followers_count === "number" ? json.followers_count : null,
        segue: typeof json.follows_count === "number" ? json.follows_count : null,
        midiaCount: typeof json.media_count === "number" ? json.media_count : null,
      }
    },

    async paginaMidias(after) {
      const json = await get<{ data?: MediaApiItem[]; paging?: { next?: string; cursors?: { after?: string } } }>(
        `${API_VERSION}/me/media`,
        {
          fields:
            "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
          limit: "25",
          ...(after ? { after } : {}),
        },
      )
      const proximo = json.paging?.next ? json.paging?.cursors?.after ?? null : null
      return { itens: (json.data ?? []).map(converterMidia), proximo }
    },

    // A Meta recusa a chamada inteira se uma métrica não existir para o tipo
    // de mídia; por isso as de conversão vão separadas e, se falharem juntas,
    // uma a uma. Métrica ausente ou sem valor vira null (nunca 0).
    async insights(mediaId, tipo) {
      const ehVideo = tipo === "REELS" || tipo === "VIDEO"
      const basicas = ehVideo
        ? ["reach", "saved", "shares", "views", "comments", "likes"]
        : ["reach", "saved", "shares", "views"]
      const extras = ehVideo ? ["reposts"] : ["profile_visits", "follows", "reposts"]

      let valores: ValoresMetricas
      try {
        valores = await pedirMetricas(mediaId, basicas)
      } catch (e) {
        if (erroFatalDaConta(e)) throw e
        if (e instanceof ErroMeta && e.tipo !== "temporario") return { status: "indisponivel", valores: {} }
        return { status: "erro", valores: {} }
      }

      let completo = true
      try {
        Object.assign(valores, await pedirMetricas(mediaId, extras))
      } catch (e) {
        if (erroFatalDaConta(e)) throw e
        for (const nome of extras) {
          try {
            Object.assign(valores, await pedirMetricas(mediaId, [nome]))
          } catch (e2) {
            if (erroFatalDaConta(e2)) throw e2
            if (e2 instanceof ErroMeta && e2.tipo === "permanente") valores[CAMPO_DA_METRICA[nome]] = null
            else completo = false
          }
        }
      }
      return { status: completo ? "ok" : "parcial", valores }
    },

    async renovarToken() {
      const json = await get<{ access_token?: string; expires_in?: number }>("refresh_access_token", {
        grant_type: "ig_refresh_token",
      })
      if (!json.access_token) throw new ErroMeta("permanente", "renovacao_sem_token")
      return { accessToken: json.access_token, expiresIn: json.expires_in ?? 60 * 60 * 24 * 60 }
    },

    trocarToken(novo) {
      token = novo
    },
    chamadas: () => chamadas,
    proximoDoLimite: () => usoMaximo >= LIMITE_USO_PERCENTUAL,
  }
}
