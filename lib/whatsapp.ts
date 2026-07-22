import "server-only"

// Envio de mensagens via Evolution API (mesmo padrão do dashboard_zapflow).
// Variáveis de ambiente necessárias:
//   EVOLUTION_API_URL   -> ex.: https://evolution.suavps.com
//   EVOLUTION_API_KEY   -> apikey global/da instância
//   EVOLUTION_INSTANCE  -> nome da instância conectada ao WhatsApp
//
// O destino (grupo) é passado por parâmetro. Para grupos, o JID termina em "@g.us".

type EnvioResultado = { ok: boolean; status: number; erro?: string }

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
    const res = await fetch(`${base}/instance/connectionState/${encodeURIComponent(instancia)}`, {
      method: "GET",
      headers: { apikey: apiKey },
      cache: "no-store",
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
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { configurado: true, grupoConfigurado, conexao: "desconhecido", erro: msg }
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
    const res = await fetch(`${base}/message/sendText/${encodeURIComponent(instancia)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({ number, text: texto }),
      cache: "no-store",
    })
    if (!res.ok) {
      const corpo = await res.text().catch(() => "")
      return { ok: false, status: res.status, erro: corpo.slice(0, 500) || res.statusText }
    }
    return { ok: true, status: res.status }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido no envio."
    return { ok: false, status: 0, erro: msg }
  }
}
