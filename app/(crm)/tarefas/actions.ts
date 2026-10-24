"use server"

import { revalidatePath } from "next/cache"
import {
  alternarConclusao,
  atualizarTarefa,
  criarTarefa,
  excluirTarefa,
  type TarefaInput,
} from "@/lib/tarefas-db"
import { registrarAtividade } from "@/lib/atividades-db"

export type EstadoForm = { ok: boolean; erro?: string }

function lerTarefa(formData: FormData): TarefaInput {
  return {
    titulo: String(formData.get("titulo") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    clienteId: String(formData.get("clienteId") ?? ""),
    responsavelId: String(formData.get("responsavelId") ?? ""),
    prazo: String(formData.get("prazo") ?? ""),
    prioridade: String(formData.get("prioridade") ?? "media"),
    status: String(formData.get("status") ?? "pendente"),
  }
}

export async function criarTarefaAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const dados = lerTarefa(formData)
  if (!dados.titulo.trim()) {
    return { ok: false, erro: "Informe o título da tarefa." }
  }
  try {
    await criarTarefa(dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }
  await registrarAtividade({
    modulo: "tarefas",
    acao: "criar",
    entidadeTipo: "tarefa",
    entidadeNome: dados.titulo,
    descricao: `Criou a tarefa "${dados.titulo}"`,
  })
  revalidatePath("/tarefas")
  revalidatePath("/calendario")
  revalidatePath("/")
  return { ok: true }
}

export async function atualizarTarefaAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) return { ok: false, erro: "Tarefa não identificada." }
  const dados = lerTarefa(formData)
  if (!dados.titulo.trim()) {
    return { ok: false, erro: "Informe o título da tarefa." }
  }
  try {
    await atualizarTarefa(id, dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }
  await registrarAtividade({
    modulo: "tarefas",
    acao: "atualizar",
    entidadeTipo: "tarefa",
    entidadeId: id,
    entidadeNome: dados.titulo,
    descricao: `Editou a tarefa "${dados.titulo}"`,
  })
  revalidatePath("/tarefas")
  revalidatePath("/calendario")
  revalidatePath("/")
  return { ok: true }
}

// Usada pelo checkbox da lista: marca/desmarca como concluída.
export async function alternarConclusaoAction(id: string, concluida: boolean): Promise<EstadoForm> {
  if (!id) return { ok: false, erro: "Tarefa não identificada." }
  try {
    await alternarConclusao(id, concluida)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao atualizar."
    return { ok: false, erro: msg }
  }
  await registrarAtividade({
    modulo: "tarefas",
    acao: concluida ? "concluir" : "reabrir",
    entidadeTipo: "tarefa",
    entidadeId: id,
    descricao: concluida ? "Concluiu uma tarefa" : "Reabriu uma tarefa",
  })
  revalidatePath("/tarefas")
  revalidatePath("/calendario")
  revalidatePath("/")
  return { ok: true }
}

export async function excluirTarefaAction(id: string): Promise<EstadoForm> {
  if (!id) return { ok: false, erro: "Tarefa não identificada." }
  try {
    await excluirTarefa(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao excluir."
    return { ok: false, erro: msg }
  }
  await registrarAtividade({
    modulo: "tarefas",
    acao: "excluir",
    entidadeTipo: "tarefa",
    entidadeId: id,
    descricao: "Excluiu uma tarefa",
  })
  revalidatePath("/tarefas")
  revalidatePath("/calendario")
  revalidatePath("/")
  return { ok: true }
}
