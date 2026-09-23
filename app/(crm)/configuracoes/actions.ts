"use server"

import { revalidatePath } from "next/cache"
import { criarMembro, atualizarMembro, excluirMembro } from "@/lib/membros-db"
import { registrarAtividade } from "@/lib/atividades-db"

export type EstadoEquipe = { ok: boolean; erro?: string }

export async function salvarMembroAction(
  _prev: EstadoEquipe,
  formData: FormData,
): Promise<EstadoEquipe> {
  const id = String(formData.get("id") ?? "").trim()
  const nome = String(formData.get("nome") ?? "").trim()
  const cargo = String(formData.get("cargo") ?? "").trim()
  const pin = String(formData.get("pin") ?? "").trim()

  if (!nome) {
    return { ok: false, erro: "Informe o nome do membro." }
  }
  if (pin && !/^\d{4,8}$/.test(pin)) {
    return { ok: false, erro: "O PIN deve ter de 4 a 8 dígitos numéricos." }
  }

  try {
    if (id) {
      await atualizarMembro(id, { nome, cargo, pin })
    } else {
      await criarMembro({ nome, cargo, pin })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  await registrarAtividade({
    modulo: "equipe",
    acao: id ? "atualizar" : "criar",
    entidadeTipo: "membro",
    entidadeId: id || null,
    entidadeNome: nome,
    descricao: id ? `Atualizou o membro ${nome}` : `Adicionou o membro ${nome} à equipe`,
  })

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

  await registrarAtividade({
    modulo: "equipe",
    acao: "excluir",
    entidadeTipo: "membro",
    entidadeId: id,
    descricao: "Removeu um membro da equipe",
  })

  revalidatePath("/configuracoes")
  return { ok: true }
}
