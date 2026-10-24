import "server-only"
import { cookies } from "next/headers"
import type { UsuarioSessao } from "@/lib/tipos-sessao"
import { COOKIE_SESSAO, MAX_AGE_SESSAO, desserializarSessao, serializarSessao } from "@/lib/sessao-token"

export type { UsuarioSessao } from "@/lib/tipos-sessao"
export { desserializarSessao, segredoSessao, serializarSessao } from "@/lib/sessao-token"

export async function criarSessao(u: UsuarioSessao): Promise<boolean> {
  const valor = serializarSessao(u)
  if (!valor) return false
  const jar = await cookies()
  jar.set(COOKIE_SESSAO, valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SESSAO,
  })
  return true
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_SESSAO)
}

// Lê apenas o cookie assinado. Para autorizar operações use lib/auth.ts,
// que também confere se o membro ainda existe na equipe.
export async function getUsuarioAtual(): Promise<UsuarioSessao | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE_SESSAO)?.value
  if (!raw) return null
  return desserializarSessao(raw)
}
