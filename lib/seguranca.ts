import crypto from "node:crypto"

/** Comparação de segredos em tempo constante (evita ataque de temporização). */
export function segredoIgual(recebido: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!recebido || !esperado) return false
  const a = crypto.createHash("sha256").update(recebido).digest()
  const b = crypto.createHash("sha256").update(esperado).digest()
  return crypto.timingSafeEqual(a, b)
}

/** Autoriza chamadas do Vercel Cron (Authorization: Bearer) ou manuais (?key=). */
export function cronAutorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ") && segredoIgual(auth.slice(7), secret)) return true
  return segredoIgual(new URL(req.url).searchParams.get("key"), secret)
}

// Tokens do portal são UUID/hex/base64url gerados pelo banco. Rejeitar formatos
// absurdos antes da consulta evita varredura barata e entradas gigantes.
export function tokenPortalValido(token: string | null | undefined): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(token)
}

const JANELA_MS = 15 * 60 * 1000
const MAX_FALHAS = 8
const falhasPorChave = new Map<string, { falhas: number; inicio: number }>()

// Limitador em memória por instância. Reduz força bruta do PIN; para limite
// global entre instâncias, use um armazenamento compartilhado (ex.: Redis).
export function tentativasBloqueadas(chave: string, agora = Date.now()): boolean {
  const registro = falhasPorChave.get(chave)
  if (!registro) return false
  if (agora - registro.inicio > JANELA_MS) {
    falhasPorChave.delete(chave)
    return false
  }
  return registro.falhas >= MAX_FALHAS
}

export function registrarFalha(chave: string, agora = Date.now()): void {
  const registro = falhasPorChave.get(chave)
  if (!registro || agora - registro.inicio > JANELA_MS) {
    falhasPorChave.set(chave, { falhas: 1, inicio: agora })
  } else {
    registro.falhas += 1
  }
}

export function limparFalhas(chave: string): void {
  falhasPorChave.delete(chave)
}
