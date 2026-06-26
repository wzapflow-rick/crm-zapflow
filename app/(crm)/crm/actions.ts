"use server"

import { revalidatePath } from "next/cache"
import {
  atualizarNegocio,
  criarNegocio,
  excluirNegocio,
  moverNegocio,
  type NegocioInput,
} from "@/lib/crm-db"

export type EstadoForm = { ok: boolean; erro?: string }

function lerNegocio(formData: FormData): NegocioInput {
  return {
    titulo: String(formData.get("titulo") ?? ""),
    contato: String(formData.get("contato") ?? ""),
    valor: Number(formData.get("valor")) || 0,
    origem: String(formData.get("origem") ?? ""),
    etapa: String(formData.get("etapa") ?? "novo"),
    responsavelId: String(formData.get("responsavelId") ?? ""),
    nota: String(formData.get("nota") ?? ""),
  }
}

export async function criarNegocioAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const dados = lerNegocio(formData)
  if (!dados.titulo.trim()) {
    return { ok: false, erro: "Informe o nome do negócio." }
  }
  try {
    await criarNegocio(dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }
  revalidatePath("/crm")
  return { ok: true }
}

export async function atualizarNegocioAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) return { ok: false, erro: "Negócio não identificado." }
  const dados = lerNegocio(formData)
  if (!dados.titulo.trim()) {
    return { ok: false, erro: "Informe o nome do negócio." }
  }
  try {
    await atualizarNegocio(id, dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }
  revalidatePath("/crm")
  return { ok: true }
}

// Usada pelo arrastar-e-soltar: move o negócio para outra etapa do funil.
export async function moverNegocioAction(id: string, etapa: string): Promise<EstadoForm> {
  if (!id) return { ok: false, erro: "Negócio não identificado." }
  try {
    await moverNegocio(id, etapa)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao mover."
    return { ok: false, erro: msg }
  }
  revalidatePath("/crm")
  return { ok: true }
}

export async function excluirNegocioAction(id: string): Promise<EstadoForm> {
  if (!id) return { ok: false, erro: "Negócio não identificado." }
  try {
    await excluirNegocio(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao excluir."
    return { ok: false, erro: msg }
  }
  revalidatePath("/crm")
  return { ok: true }
}
