import "server-only"

// Envio de mensagens via Evolution API (mesmo padrão do dashboard_zapflow).
// Variáveis de ambiente necessárias:
//   EVOLUTION_API_URL   -> ex.: https://evolution.suavps.com
//   EVOLUTION_API_KEY   -> apikey global/da instância
//   EVOLUTION_INSTANCE  -> nome da instância conectada ao WhatsApp
//
// O destino (grupo) é passado por parâmetro. Para grupos, o JID termina em "@g.us".

type EnvioResultado = { ok: boolean; status: number; erro?: string }

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
