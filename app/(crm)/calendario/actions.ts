"use server"

import { revalidatePath } from "next/cache"
import {
  alternarConclusaoEvento,
  atualizarEvento,
  criarEvento,
  excluirEvento,
  type EventoInput,
} from "@/lib/eventos-db"

export type EstadoForm = { ok: boolean; erro?: string }

function lerEvento(formData: FormData): EventoInput {
  // Vários responsáveis chegam como múltiplos campos "responsaveis"
  const responsaveisIds = formData
    .getAll("responsaveis")
    .map((v) => String(v))
    .filter(Boolean)
  return {
    titulo: String(formData.get("titulo") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    tipo: String(formData.get("tipo") ?? "reuniao"),
    data: String(formData.get("data") ?? ""),
    hora: String(formData.get("hora") ?? ""),
    clienteId: String(formData.get("clienteId") ?? ""),
    responsaveisIds,
  }
}

export async function criarEventoAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const dados = lerEvento(formData)
  if (!dados.titulo.trim()) return { ok: false, erro: "Informe o título do compromisso." }
  if (!dados.data) return { ok: false, erro: "Informe a data do compromisso." }
  try {
    await criarEvento(dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }
  revalidatePath("/calendario")
  revalidatePath("/tarefas")
  revalidatePath("/")
  return { ok: true }
}

export async function atualizarEventoAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) return { ok: false, erro: "Compromisso não identificado." }
  const dados = lerEvento(formData)
  if (!dados.titulo.trim()) return { ok: false, erro: "Informe o título do compromisso." }
  if (!dados.data) return { ok: false, erro: "Informe a data do compromisso." }
  try {
    await atualizarEvento(id, dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }
  revalidatePath("/calendario")
  revalidatePath("/tarefas")
  revalidatePath("/")
  return { ok: true }
}

export async function excluirEventoAction(id: string): Promise<EstadoForm> {
  if (!id) return { ok: false, erro: "Compromisso não identificado." }
  try {
    await excluirEvento(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao excluir."
    return { ok: false, erro: msg }
  }
  revalidatePath("/calendario")
  revalidatePath("/tarefas")
  revalidatePath("/")
  return { ok: true }
}

// Usada pelo checkbox do checklist de Tarefas: marca/desmarca o compromisso.
export async function alternarConclusaoEventoAction(id: string, concluido: boolean): Promise<EstadoForm> {
  if (!id) return { ok: false, erro: "Compromisso não identificado." }
  try {
    await alternarConclusaoEvento(id, concluido)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao atualizar."
    return { ok: false, erro: msg }
  }
  revalidatePath("/tarefas")
  revalidatePath("/calendario")
  revalidatePath("/")
  return { ok: true }
}
