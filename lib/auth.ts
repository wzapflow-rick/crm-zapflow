import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { getUsuarioAtual, type UsuarioSessao } from "@/lib/sessao"
import { getMembroPorId } from "@/lib/membros-db"

export const ID_ADMIN = "admin"

export class AcessoNegadoError extends Error {
  constructor(mensagem = "Você não tem permissão para esta operação.") {
    super(mensagem)
    this.name = "AcessoNegadoError"
  }
}

// Valida o cookie e, para membros, confirma que ainda fazem parte da equipe:
// remover alguém em Configurações revoga o acesso imediatamente.
// Memoizado por requisição para não repetir a consulta em actions encadeadas.
export const usuarioAutenticado = cache(async (): Promise<UsuarioSessao | null> => {
  const usuario = await getUsuarioAtual()
  if (!usuario) return null
  if (usuario.id === ID_ADMIN) return usuario
  const membro = await getMembroPorId(usuario.id).catch(() => null)
  return membro ? usuario : null
})

export function ehAdmin(usuario: UsuarioSessao | null | undefined): boolean {
  return usuario?.id === ID_ADMIN
}

/** Server Actions e páginas internas: exige sessão válida, senão manda para o login. */
export async function exigirUsuario(): Promise<UsuarioSessao> {
  const usuario = await usuarioAutenticado()
  if (!usuario) redirect("/login")
  return usuario
}

/** Operações administrativas (gestão da equipe e PINs). */
export async function exigirAdmin(): Promise<UsuarioSessao> {
  const usuario = await exigirUsuario()
  if (!ehAdmin(usuario)) throw new AcessoNegadoError()
  return usuario
}

/** Route Handlers internos: devolve 401 em vez de redirecionar. */
export async function exigirUsuarioApi(): Promise<UsuarioSessao | Response> {
  const usuario = await usuarioAutenticado()
  if (usuario) return usuario
  return Response.json({ erro: "Não autenticado." }, { status: 401, headers: { "Cache-Control": "no-store" } })
}
