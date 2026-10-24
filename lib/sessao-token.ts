import crypto from "node:crypto"
import type { UsuarioSessao } from "@/lib/tipos-sessao"

// Módulo puro (sem next/headers nem server-only) para poder ser usado tanto
// pelas actions quanto pelo proxy.ts, que roda antes de qualquer página.

export const COOKIE_SESSAO = "simple_sessao"
export const MAX_AGE_SESSAO = 60 * 60 * 24 * 30 // 30 dias
const SEGREDO_DESENVOLVIMENTO = "simple-os-sessao-apenas-desenvolvimento"

type PayloadSessao = UsuarioSessao & { exp: number }

// Em produção não existe segredo padrão: sem CRM_SESSION_SECRET a sessão não é
// emitida nem aceita (fail-closed), em vez de assinar cookies com um valor público.
export function segredoSessao(): string | null {
  const configurado = process.env.CRM_SESSION_SECRET || process.env.SIMPLE_SESSION_SECRET
  if (configurado) return configurado
  return process.env.NODE_ENV === "production" ? null : SEGREDO_DESENVOLVIMENTO
}

function assinar(corpo: string, segredo: string): string {
  return crypto.createHmac("sha256", segredo).update(corpo).digest("base64url")
}

export function serializarSessao(u: UsuarioSessao, agoraMs = Date.now()): string | null {
  const segredo = segredoSessao()
  if (!segredo) return null
  const payload: PayloadSessao = { ...u, exp: Math.floor(agoraMs / 1000) + MAX_AGE_SESSAO }
  const corpo = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${corpo}.${assinar(corpo, segredo)}`
}

export function desserializarSessao(valor: string, agoraMs = Date.now()): UsuarioSessao | null {
  const segredo = segredoSessao()
  if (!segredo) return null
  const [corpo, sig, ...resto] = valor.split(".")
  if (!corpo || !sig || resto.length > 0) return null
  const a = Buffer.from(sig)
  const b = Buffer.from(assinar(corpo, segredo))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const obj = JSON.parse(Buffer.from(corpo, "base64url").toString()) as Partial<PayloadSessao>
    if (!obj || typeof obj.id !== "string" || typeof obj.nome !== "string") return null
    if (typeof obj.exp !== "number" || obj.exp * 1000 <= agoraMs) return null
    return {
      id: obj.id,
      nome: obj.nome,
      iniciais: String(obj.iniciais ?? ""),
      cor: String(obj.cor ?? ""),
      cargo: String(obj.cargo ?? ""),
    }
  } catch {
    return null
  }
}
