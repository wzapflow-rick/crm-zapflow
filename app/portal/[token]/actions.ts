"use server"

import { revalidatePath } from "next/cache"
import { getClientePorToken, adicionarMensagemCliente } from "@/lib/clientes-db"

export type EstadoPortal = { ok: boolean; erro?: string }

export async function enviarMensagemPortalAction(
  _prev: EstadoPortal,
  formData: FormData,
): Promise<EstadoPortal> {
  const token = String(formData.get("token") ?? "").trim()
  const texto = String(formData.get("texto") ?? "").trim()
  const autorNome = String(formData.get("autorNome") ?? "").trim()

  if (!token) {
    return { ok: false, erro: "Link inválido." }
  }
  if (!texto) {
    return { ok: false, erro: "Escreva uma mensagem antes de enviar." }
  }

  // Valida o token: só envia se ele corresponder a um cliente real.
  let cliente
  try {
    cliente = await getClientePorToken(token)
  } catch {
    return { ok: false, erro: "Não foi possível validar seu acesso. Tente novamente." }
  }
  if (!cliente) {
    return { ok: false, erro: "Link inválido ou expirado." }
  }

  try {
    await adicionarMensagemCliente(cliente.id, texto, autorNome || cliente.nome)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível enviar: ${msg}` }
  }

  revalidatePath(`/portal/${token}`)
  return { ok: true }
}
