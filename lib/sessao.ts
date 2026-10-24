import "server-only"
import { cookies } from "next/headers"
import crypto from "node:crypto"
import type { UsuarioSessao } from "@/lib/tipos-sessao"

export type { UsuarioSessao } from "@/lib/tipos-sessao"

const COOKIE = "simple_sessao"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dias
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
  const payload: PayloadSessao = { ...u, exp: Math.floor(agoraMs / 1000) + MAX_AGE }
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

export async function criarSessao(u: UsuarioSessao): Promise<boolean> {
  const valor = serializarSessao(u)
  if (!valor) return false
  const jar = await cookies()
  jar.set(COOKIE, valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
  return true
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}

// Lê apenas o cookie assinado. Para autorizar operações use lib/auth.ts,
// que também confere se o membro ainda existe na equipe.
export async function getUsuarioAtual(): Promise<UsuarioSessao | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) return null
  return desserializarSessao(raw)
}
