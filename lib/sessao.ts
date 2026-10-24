import "server-only"
import { cookies } from "next/headers"
import crypto from "node:crypto"
import type { UsuarioSessao } from "@/lib/tipos-sessao"

export type { UsuarioSessao } from "@/lib/tipos-sessao"

const COOKIE = "simple_sessao"
// Segredo para assinar o cookie. Defina SIMPLE_SESSION_SECRET no ambiente para
// endurecer a segurança; há um fallback para o app funcionar sem configuração.
const SEGREDO = process.env.SIMPLE_SESSION_SECRET || "simple-os-sessao-troque-este-segredo"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

function assinar(corpo: string): string {
  return crypto.createHmac("sha256", SEGREDO).update(corpo).digest("base64url")
}

function serializar(u: UsuarioSessao): string {
  const corpo = Buffer.from(JSON.stringify(u)).toString("base64url")
  return `${corpo}.${assinar(corpo)}`
}

function desserializar(valor: string): UsuarioSessao | null {
  const [corpo, sig] = valor.split(".")
  if (!corpo || !sig) return null
  const esperado = assinar(corpo)
  // Comparação em tempo constante; exige buffers de mesmo tamanho.
  const a = Buffer.from(sig)
  const b = Buffer.from(esperado)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const obj = JSON.parse(Buffer.from(corpo, "base64url").toString()) as UsuarioSessao
    if (!obj || typeof obj.id !== "string" || typeof obj.nome !== "string") return null
    return obj
  } catch {
    return null
  }
}

export async function criarSessao(u: UsuarioSessao): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE, serializar(u), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function getUsuarioAtual(): Promise<UsuarioSessao | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) return null
  return desserializar(raw)
}
