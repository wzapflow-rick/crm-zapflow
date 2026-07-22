import "server-only"

// Envio de mensagens via Evolution API (mesmo padrão do dashboard_zapflow).
// Variáveis de ambiente necessárias:
//   EVOLUTION_API_URL   -> ex.: https://evolution.suavps.com
//   EVOLUTION_API_KEY   -> apikey global/da instância
//   EVOLUTION_INSTANCE  -> nome da instância conectada ao WhatsApp
//
// O destino (grupo) é passado por parâmetro. Para grupos, o JID termina em "@g.us".

type EnvioResultado = { ok: boolean; status: number; erro?: string }

// Timeout para chamadas à Evolution API. Sem isso, se o servidor estiver fora do ar
// ou travado, o fetch fica pendurado até o Vercel matar a função (erro 500 / página quebrada).
const EVOLUTION_TIMEOUT_MS = 8000

async function fetchEvolution(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), EVOLUTION_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" })
  } finally {
    clearTimeout(timer)
  }
}

// Traduz erros de fetch (timeout/rede) numa mensagem amigável.
function mensagemErroRede(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "AbortError") {
      return "A Evolution API não respondeu a tempo (servidor pode estar fora do ar ou sobrecarregado)."
    }
    return e.message
  }
  return "Erro desconhecido de rede."
}

export type EstadoWhatsApp = {
  configurado: boolean // URL + KEY + INSTANCE presentes
  grupoConfigurado: boolean // SOCIOS_GROUP_ID presente
  conexao: "conectado" | "desconectado" | "conectando" | "desconhecido"
  erro?: string
}

// Consulta o estado da conexão da instância na Evolution API.
// Serve para diagnosticar por que o "bom dia" parou (ex.: sessão do WhatsApp caiu).
export async function estadoInstancia(): Promise<EstadoWhatsApp> {
  const base = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "")
  const apiKey = process.env.EVOLUTION_API_KEY
  const instancia = process.env.EVOLUTION_INSTANCE
  const grupoConfigurado = Boolean(process.env.SOCIOS_GROUP_ID)

  if (!base || !apiKey || !instancia) {
    return {
      configurado: false,
      grupoConfigurado,
      conexao: "desconhecido",
      erro: "Evolution API não configurada (URL, KEY ou INSTANCE ausente).",
    }
  }

  try {
    const res = await fetchEvolution(`${base}/instance/connectionState/${encodeURIComponent(instancia)}`, {
      method: "GET",
      headers: { apikey: apiKey },
    })
    if (!res.ok) {
      const corpo = await res.text().catch(() => "")
      return {
        configurado: true,
        grupoConfigurado,
        conexao: "desconhecido",
        erro: `Evolution respondeu ${res.status}: ${corpo.slice(0, 300) || res.statusText}`,
      }
    }
    const data = (await res.json().catch(() => ({}))) as {
      instance?: { state?: string }
      state?: string
    }
    const state = data.instance?.state ?? data.state ?? ""
    const conexao =
      state === "open"
        ? "conectado"
        : state === "connecting"
          ? "conectando"
          : state === "close"
            ? "desconectado"
            : "desconhecido"
    return { configurado: true, grupoConfigurado, conexao }
  } catch (e) {
    return { configurado: true, grupoConfigurado, conexao: "desconhecido", erro: mensagemErroRede(e) }
  }
}

export type ReconexaoWhatsApp = {
  ok: boolean
  jaConectado?: boolean // instância já estava conectada, não precisa de QR
  qrBase64?: string // imagem do QR code (data URI) para ler no app do WhatsApp
  pairingCode?: string // código alternativo de pareamento (digitado no celular)
  erro?: string
}

// Inicia a reconexão da instância e devolve o QR code (ou código de pareamento)
// para o usuário reconectar a sessão do WhatsApp direto pelo CRM.
export async function reconectarInstancia(): Promise<ReconexaoWhatsApp> {
  const base = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "")
  const apiKey = process.env.EVOLUTION_API_KEY
  const instancia = process.env.EVOLUTION_INSTANCE

  if (!base || !apiKey || !instancia) {
    return { ok: false, erro: "Evolution API não configurada (URL, KEY ou INSTANCE ausente)." }
  }

  try {
    const res = await fetchEvolution(`${base}/instance/connect/${encodeURIComponent(instancia)}`, {
      method: "GET",
      headers: { apikey: apiKey },
    })
    const corpo = await res.text().catch(() => "")
    if (!res.ok) {
      return { ok: false, erro: `Evolution respondeu ${res.status}: ${corpo.slice(0, 300) || res.statusText}` }
    }

    let data: {
      base64?: string
      code?: string
      pairingCode?: string
      count?: number
      instance?: { state?: string }
      state?: string
    } = {}
    try {
      data = JSON.parse(corpo)
    } catch {
      return { ok: false, erro: "Resposta inesperada da Evolution API ao reconectar." }
    }

    // Alguns retornos indicam que já está conectado (sem QR).
    const state = data.instance?.state ?? data.state
    if (state === "open") {
      return { ok: true, jaConectado: true }
    }

    const qr = data.base64
    const qrBase64 = qr ? (qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`) : undefined

    if (!qrBase64 && !data.pairingCode) {
      return { ok: false, erro: "A Evolution API não retornou QR code. Tente novamente em alguns segundos." }
    }

    return { ok: true, qrBase64, pairingCode: data.pairingCode }
  } catch (e) {
    return { ok: false, erro: mensagemErroRede(e) }
  }
}

// Garante o sufixo de grupo (@g.us). Aceita tanto "12036..." quanto "12036...@g.us".
function normalizarDestino(destino: string): string {
  const limpo = destino.trim()
  if (!limpo) return ""
  if (limpo.includes("@")) return limpo
  // Só dígitos e tem cara de id de grupo (longo) -> trata como grupo.
  return `${limpo}@g.us`
}

export async function enviarTextoWhatsApp(destino: string, texto: string): Promise<EnvioResultado> {
  const base = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "")
  const apiKey = process.env.EVOLUTION_API_KEY
  const instancia = process.env.EVOLUTION_INSTANCE

  if (!base || !apiKey || !instancia) {
    return { ok: false, status: 0, erro: "Evolution API não configurada (URL, KEY ou INSTANCE ausente)." }
  }
  const number = normalizarDestino(destino)
  if (!number) {
    return { ok: false, status: 0, erro: "Destino (grupo) não informado." }
  }

  try {
    const res = await fetchEvolution(`${base}/message/sendText/${encodeURIComponent(instancia)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({ number, text: texto }),
    })
    if (!res.ok) {
      const corpo = await res.text().catch(() => "")
      return { ok: false, status: res.status, erro: corpo.slice(0, 500) || res.statusText }
    }
    return { ok: true, status: res.status }
  } catch (e) {
    return { ok: false, status: 0, erro: mensagemErroRede(e) }
  }
}
