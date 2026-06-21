// Cliente da Evolution API (instância única via env vars).
// Sem as envs (ex.: preview do v0), o cliente fica "desligado" e o envio
// vira no-op — a UI segue com o estado otimista, nada quebra.

const API_URL = process.env.EVOLUTION_API_URL
const API_KEY = process.env.EVOLUTION_API_KEY
const INSTANCE = process.env.EVOLUTION_INSTANCE

export const evolutionConfigurada = Boolean(API_URL && API_KEY && INSTANCE)

// Normaliza um telefone para o formato que a Evolution espera (apenas dígitos,
// com DDI). Aceita entradas como "+55 (79) 99999-0001" ou um JID
// "5579999990001@s.whatsapp.net".
export function normalizarTelefone(valor: string): string {
  const semJid = valor.split("@")[0]
  const digitos = semJid.replace(/\D/g, "")
  return digitos
}

type EnvioResultado = {
  ok: boolean
  messageId?: string
  erro?: string
}

// Envia uma mensagem de texto. Retorna o id da mensagem na Evolution quando
// disponível (para casar com o webhook e evitar duplicar no inbox).
export async function enviarTexto(
  telefone: string,
  texto: string,
): Promise<EnvioResultado> {
  if (!evolutionConfigurada) {
    return { ok: false, erro: "Evolution não configurada (preview)." }
  }

  const numero = normalizarTelefone(telefone)
  if (!numero) return { ok: false, erro: "Telefone inválido." }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const resp = await fetch(
      `${API_URL!.replace(/\/$/, "")}/message/sendText/${INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY!,
        },
        body: JSON.stringify({
          number: numero,
          text: texto,
        }),
        signal: controller.signal,
      },
    )

    if (!resp.ok) {
      const corpo = await resp.text().catch(() => "")
      console.log("[v0] Evolution: envio falhou", resp.status, corpo.slice(0, 200))
      return { ok: false, erro: `Evolution respondeu ${resp.status}` }
    }

    const dados = (await resp.json().catch(() => null)) as
      | { key?: { id?: string } }
      | null
    return { ok: true, messageId: dados?.key?.id }
  } catch (err) {
    console.log(
      "[v0] Evolution: erro de rede no envio:",
      err instanceof Error ? err.message : err,
    )
    return { ok: false, erro: "Falha de rede ao enviar." }
  } finally {
    clearTimeout(timeout)
  }
}
