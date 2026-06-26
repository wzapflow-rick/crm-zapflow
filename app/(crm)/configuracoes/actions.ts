"use server"

import { revalidatePath } from "next/cache"
import { criarMembro, atualizarMembro, excluirMembro } from "@/lib/membros-db"

export type EstadoEquipe = { ok: boolean; erro?: string }

export async function salvarMembroAction(
  _prev: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const id = String(formData.get("id") ?? "").trim()
  const nome = String(formData.get("nome") ?? "").trim()
  const cargo = String(formData.get("cargo") ?? "").trim()

  if (!nome) {
    return { ok: false, erro: "Informe o nome do membro." }
  }

  try {
    if (id) {
      await atualizarMembro(id, { nome, cargo })
    } else {
      await criarMembro({ nome, cargo })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath("/configuracoes")
  return { ok: true }
}

export async function excluirMembroAction(
  _prev: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Membro não identificado." }
  }

  try {
    await excluirMembro(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao excluir."
    return { ok: false, erro: `Não foi possível excluir: ${msg}` }
  }

  revalidatePath("/configuracoes")
  return { ok: true }
}
