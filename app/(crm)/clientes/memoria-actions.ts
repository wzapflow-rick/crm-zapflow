"use server"

import { revalidatePath } from "next/cache"
import { salvarSecaoMemoria } from "@/lib/memoria-db"

export type EstadoMemoria = { ok: boolean; erro?: string }

export async function salvarMemoriaAction(_prev: EstadoMemoria, formData: FormData): Promise<EstadoMemoria> {
  const id = String(formData.get("id") ?? "").trim()
  const secao = String(formData.get("secao") ?? "").trim()
  if (!id || !secao) {
    return { ok: false, erro: "Cliente ou seção não identificados." }
  }

  const conteudo = String(formData.get("conteudo") ?? "")

  try {
    await salvarSecaoMemoria(id, secao, conteudo)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}
