"use server"

import { revalidatePath } from "next/cache"
import { atualizarEnvio, excluirEnvio, normalizarLink } from "@/lib/envios-db"

export type EstadoEnvio = { ok: boolean; erro?: string }

// Edita um envio do cliente (renomear título/descrição e/ou substituir o link).
export async function atualizarEnvioAction(
  _prev: EstadoEnvio,
  formData: FormData,
): Promise<EstadoEnvio> {
  const id = String(formData.get("id") ?? "").trim()
  const clienteId = String(formData.get("clienteId") ?? "").trim()
  if (!id || !clienteId) {
    return { ok: false, erro: "Envio não identificado." }
  }

  const titulo = String(formData.get("titulo") ?? "").trim()
  const descricao = String(formData.get("descricao") ?? "").trim()
  const linkBruto = String(formData.get("link") ?? "").trim()
  if (!linkBruto) {
    return { ok: false, erro: "Cole o link do material." }
  }

  const link = normalizarLink(linkBruto)
  if (!link) {
    return { ok: false, erro: "Esse link não parece válido. Verifique e cole novamente." }
  }

  try {
    await atualizarEnvio(id, clienteId, { titulo, link, descricao })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível salvar: ${msg}` }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { ok: true }
}

// Exclui um envio do cliente (uso interno da equipe).
export async function excluirEnvioAction(id: string, clienteId: string): Promise<EstadoEnvio> {
  const envioId = id.trim()
  const empresaId = clienteId.trim()
  if (!envioId || !empresaId) {
    return { ok: false, erro: "Envio não identificado." }
  }

  try {
    await excluirEnvio(envioId, empresaId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível excluir: ${msg}` }
  }

  revalidatePath(`/clientes/${empresaId}`)
  return { ok: true }
}
