"use server"

import { revalidatePath } from "next/cache"
import { getClientePorToken, adicionarMensagemCliente } from "@/lib/clientes-db"
import { adicionarEnvio, normalizarLink } from "@/lib/envios-db"

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

// O cliente cola um link (Google Drive, WeTransfer, Dropbox, YouTube, etc.) com os
// vídeos/fotos. Guardamos apenas o link — sem custo de armazenamento de arquivos.
export async function enviarMaterialPortalAction(
  _prev: EstadoPortal,
  formData: FormData,
): Promise<EstadoPortal> {
  const token = String(formData.get("token") ?? "").trim()
  const titulo = String(formData.get("titulo") ?? "").trim()
  const linkBruto = String(formData.get("link") ?? "").trim()
  const descricao = String(formData.get("descricao") ?? "").trim()

  if (!token) {
    return { ok: false, erro: "Link inválido." }
  }
  if (!linkBruto) {
    return { ok: false, erro: "Cole o link do material (Google Drive, WeTransfer, etc.)." }
  }

  const link = normalizarLink(linkBruto)
  if (!link) {
    return { ok: false, erro: "Esse link não parece válido. Verifique e cole novamente." }
  }

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
    await adicionarEnvio(cliente.id, { titulo, link, descricao })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível enviar: ${msg}` }
  }

  revalidatePath(`/portal/${token}`)
  return { ok: true }
}
