import "server-only"
import { createHmac } from "node:crypto"
import type { MidiaUpsert } from "@/lib/instagram-db"

// ── Instagram API with Instagram Login (Meta Graph API) ────────────────────
// Fluxo oficial (Business Login for Instagram):
//  1. Autorização:   https://www.instagram.com/oauth/authorize
//  2. Troca do code: https://api.instagram.com/oauth/access_token  (token curto)
//  3. Token longo:   https://graph.instagram.com/access_token       (ig_exchange_token)
//  4. Dados/mídia:   https://graph.instagram.com/<versão>/...
// Docs: developers.facebook.com/docs/instagram-platform

const API_VERSION = "v23.0"
const GRAPH = `https://graph.instagram.com`
// Escopos de leitura de perfil, mídia e insights de conta profissional.
const SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"]

export function instagramConfigurado(): boolean {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET)
}

// Redirect URI: usa a env se definida (deve bater exatamente com o cadastro no
// app da Meta); senão deriva da origem da requisição.
export function getRedirectUri(origin: string): string {
  return process.env.INSTAGRAM_REDIRECT_URI || `${origin}/api/instagram/callback`
}

// ── Proteção do parâmetro state (evita CSRF/adulteração do empresaId) ──────
function stateSecret(): string {
  return process.env.INSTAGRAM_TOKEN_SECRET || process.env.INSTAGRAM_APP_SECRET || "simple-os-instagram"
}

export function assinarState(empresaId: string): string {
  const nonce = Date.now().toString(36)
  const payload = `${empresaId}.${nonce}`
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

export function verificarState(state: string): string | null {
  const partes = state.split(".")
  if (partes.length !== 3) return null
  const [empresaId, nonce, sig] = partes
  const esperado = createHmac("sha256", stateSecret()).update(`${empresaId}.${nonce}`).digest("base64url")
  return sig === esperado ? empresaId : null
}

export function buildAuthUrl(empresaId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID as string,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(","),
    state: assinarState(empresaId),
  })
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`
}

// ── Trocas de token ────────────────────────────────────────────────────────
export async function trocarCodePorToken(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID as string,
    client_secret: process.env.INSTAGRAM_APP_SECRET as string,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  })
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = (await res.json()) as { access_token?: string; user_id?: string | number; error_message?: string }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_message || "Falha ao trocar o código por token.")
  }
  return { accessToken: json.access_token, userId: String(json.user_id ?? "") }
}

export async function trocarPorTokenLongo(
  shortToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.INSTAGRAM_APP_SECRET as string,
    access_token: shortToken,
  })
  const res = await fetch(`${GRAPH}/access_token?${params.toString()}`)
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message || "Falha ao obter token de longa duração.")
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 60 * 60 * 24 * 60 }
}

export async function renovarTokenLongo(
  longToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: longToken })
  const res = await fetch(`${GRAPH}/refresh_access_token?${params.toString()}`)
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message || "Falha ao renovar o token.")
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 60 * 60 * 24 * 60 }
}

// ── Perfil e mídia ──────────────────────────────────────────────────────────
export type PerfilInstagram = {
  igUserId: string
  username: string
  nome: string | null
  accountType: string | null
  profilePictureUrl: string | null
  seguidores: number | null
  segue: number | null
  midiaCount: number | null
}

export async function buscarPerfil(token: string): Promise<PerfilInstagram> {
  const fields = "user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count"
  const res = await fetch(`${GRAPH}/${API_VERSION}/me?fields=${fields}&access_token=${token}`)
  const json = (await res.json()) as Record<string, unknown> & { error?: { message?: string } }
  if (!res.ok) throw new Error(json.error?.message || "Falha ao buscar o perfil.")
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

// Busca todo o histórico paginado e, para cada mídia, os insights disponíveis.
export async function buscarMidias(token: string, limite = 25): Promise<MidiaUpsert[]> {
  const fields =
    "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
  const itens: MediaApiItem[] = []
  const ids = new Set<string>()
  let proximaUrl: string | null = `${GRAPH}/${API_VERSION}/me/media?fields=${fields}&limit=${limite}&access_token=${encodeURIComponent(token)}`
  let paginas = 0

  while (proximaUrl && paginas < 100) {
    const res = await fetch(proximaUrl)
    const json = (await res.json()) as {
      data?: MediaApiItem[]
      paging?: { next?: string }
      error?: { message?: string }
    }
    if (!res.ok) throw new Error(json.error?.message || "Falha ao buscar as mídias.")
    for (const item of json.data ?? []) {
      if (!ids.has(item.id)) {
        ids.add(item.id)
        itens.push(item)
      }
    }
    proximaUrl = json.paging?.next ?? null
    paginas += 1
  }

  const resultado: MidiaUpsert[] = []
  for (let inicio = 0; inicio < itens.length; inicio += 6) {
    const lote = itens.slice(inicio, inicio + 6)
    const processados = await Promise.all(
      lote.map(async (item) => {
        const tipo = item.media_product_type === "REELS" ? "REELS" : item.media_type ?? "IMAGE"
        const insights = await buscarInsightsMidia(token, item.id, tipo).catch(() => ({}))
        return {
          id: item.id,
          tipo,
          legenda: item.caption ?? "",
          permalink: item.permalink ?? "",
          thumbnailUrl: item.thumbnail_url ?? item.media_url ?? "",
          mediaUrl: item.media_url ?? "",
          publicadoEm: item.timestamp ?? null,
          curtidas: item.like_count ?? null,
          comentarios: item.comments_count ?? null,
          ...insights,
        }
      }),
    )
    resultado.push(...processados)
  }
  return resultado
}

type InsightsMidia = Pick<
  MidiaUpsert,
  "alcance" | "impressoes" | "salvamentos" | "compartilhamentos" | "visualizacoes"
>

// Os insights válidos variam por tipo de mídia; pedimos um conjunto seguro e
// mapeamos o que voltar (a API pode recusar métricas não suportadas).
async function buscarInsightsMidia(token: string, mediaId: string, tipo: string): Promise<InsightsMidia> {
  const metricas =
    tipo === "REELS" || tipo === "VIDEO"
      ? "reach,saved,shares,views,comments,likes"
      : "reach,saved,shares,views"
  const res = await fetch(
    `${GRAPH}/${API_VERSION}/${mediaId}/insights?metric=${metricas}&access_token=${token}`,
  )
  if (!res.ok) return {}
  const json = (await res.json()) as { data?: { name: string; values?: { value: number }[] }[] }
  const mapa: Record<string, number> = {}
  for (const m of json.data ?? []) {
    mapa[m.name] = m.values?.[0]?.value ?? 0
  }
  return {
    alcance: mapa.reach ?? null,
    impressoes: mapa.impressions ?? null,
    salvamentos: mapa.saved ?? null,
    compartilhamentos: mapa.shares ?? null,
    visualizacoes: mapa.views ?? null,
  }
}

// ── Modo demonstração ────────────────────────────────────────────────────────
// Gera um perfil e mídias de EXEMPLO, claramente marcados. Nunca chamam a Meta.
export function gerarPerfilDemo(nomeCliente: string): PerfilInstagram {
  const handle = nomeCliente
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18)
  return {
    igUserId: "demo",
    username: handle || "cliente_demo",
    nome: nomeCliente,
    accountType: "BUSINESS",
    profilePictureUrl: null,
    seguidores: 3200 + Math.floor(Math.random() * 9000),
    segue: 300 + Math.floor(Math.random() * 500),
    midiaCount: 8,
  }
}

const FORMATOS_DEMO = ["REELS", "IMAGE", "CAROUSEL_ALBUM", "VIDEO"] as const
const LEGENDAS_DEMO = [
  "Bastidores da nossa última produção 🎬",
  "3 erros que você comete no seu marketing",
  "Antes e depois: o resultado fala por si",
  "Dica rápida pra bombar no Instagram",
  "Você pediu, a gente entregou!",
  "O segredo por trás desse resultado",
  "Passo a passo pra começar hoje",
  "Prova social que ninguém te mostra",
]

export function gerarMidiasDemo(): MidiaUpsert[] {
  const hoje = Date.now()
  return LEGENDAS_DEMO.map((legenda, i) => {
    const tipo = FORMATOS_DEMO[i % FORMATOS_DEMO.length]
    const alcance = 1500 + Math.floor(Math.random() * 12000)
    const curtidas = Math.floor(alcance * (0.03 + Math.random() * 0.06))
    const comentarios = Math.floor(curtidas * (0.02 + Math.random() * 0.08))
    const salvamentos = Math.floor(alcance * (0.01 + Math.random() * 0.04))
    const compartilhamentos = Math.floor(alcance * (0.005 + Math.random() * 0.03))
    const visualizacoes = tipo === "REELS" || tipo === "VIDEO" ? alcance + Math.floor(Math.random() * 8000) : null
    return {
      id: `demo-${i}-${hoje}`,
      tipo,
      legenda,
      permalink: "",
      thumbnailUrl: "",
      mediaUrl: "",
      publicadoEm: new Date(hoje - i * 1000 * 60 * 60 * 24 * 3).toISOString(),
      curtidas,
      comentarios,
      alcance,
      impressoes: Math.floor(alcance * (1.1 + Math.random() * 0.5)),
      salvamentos,
      compartilhamentos,
      visualizacoes,
    }
  })
}
