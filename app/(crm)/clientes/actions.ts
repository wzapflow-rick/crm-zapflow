"use server"

import { revalidatePath } from "next/cache"
import {
  atualizarCliente,
  criarCliente,
  salvarEventos,
  salvarVisaoGeral,
  type AtualizarCliente,
  type EventoInput,
  type MetaInput,
  type NovoCliente,
} from "@/lib/clientes-db"
import type { StatusCliente } from "@/lib/simple-data"

export type EstadoForm = { ok: boolean; erro?: string }

function lerMrr(formData: FormData): number {
  const bruto = String(formData.get("mrr") ?? "").replace(/\./g, "").replace(",", ".")
  const n = bruto ? Number(bruto) : 0
  return Number.isFinite(n) ? n : 0
}

export async function criarClienteAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim()
  if (!nome) {
    return { ok: false, erro: "Informe o nome do cliente." }
  }

  const dados: NovoCliente = {
    nome,
    segmento: String(formData.get("segmento") ?? "") || undefined,
    status: (String(formData.get("status") ?? "onboarding") as StatusCliente) || undefined,
    objetivo: String(formData.get("objetivo") ?? "") || undefined,
    contato: String(formData.get("contato") ?? "") || undefined,
    telefone: String(formData.get("telefone") ?? "") || undefined,
    mrr: lerMrr(formData),
    desde: String(formData.get("desde") ?? "") || undefined,
    responsavelId: String(formData.get("responsavelId") ?? "") || undefined,
  }

  try {
    await criarCliente(dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath("/clientes")
  return { ok: true }
}

export async function atualizarClienteAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }
  const nome = String(formData.get("nome") ?? "").trim()
  if (!nome) {
    return { ok: false, erro: "Informe o nome do cliente." }
  }

  const dados: AtualizarCliente = {
    nome,
    segmento: String(formData.get("segmento") ?? "") || undefined,
    status: (String(formData.get("status") ?? "") as StatusCliente) || undefined,
    objetivo: String(formData.get("objetivo") ?? "") || undefined,
    contato: String(formData.get("contato") ?? "") || undefined,
    telefone: String(formData.get("telefone") ?? "") || undefined,
    mrr: lerMrr(formData),
    desde: String(formData.get("desde") ?? "") || undefined,
    responsavelId: String(formData.get("responsavelId") ?? "") || null,
  }

  try {
    await atualizarCliente(id, dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível atualizar no banco: ${msg}` }
  }

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

export async function salvarVisaoGeralAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }

  const resumo = String(formData.get("resumoEstrategico") ?? "")

  let metas: MetaInput[] = []
  try {
    const bruto = String(formData.get("metas") ?? "[]")
    const parsed = JSON.parse(bruto) as unknown
    if (Array.isArray(parsed)) {
      metas = parsed
        .map((m) => {
          const item = m as Record<string, unknown>
          return {
            rotulo: String(item.rotulo ?? ""),
            atual: Number(item.atual) || 0,
            alvo: Number(item.alvo) || 0,
            unidade: item.unidade ? String(item.unidade) : undefined,
          }
        })
        .filter((m) => m.rotulo.trim())
    }
  } catch {
    return { ok: false, erro: "Não foi possível ler as metas." }
  }

  try {
    await salvarVisaoGeral(id, resumo, metas)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

export async function salvarEventosAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }

  let eventos: EventoInput[] = []
  try {
    const bruto = String(formData.get("eventos") ?? "[]")
    const parsed = JSON.parse(bruto) as unknown
    if (Array.isArray(parsed)) {
      eventos = parsed
        .map((e) => {
          const item = e as Record<string, unknown>
          return {
            titulo: String(item.titulo ?? ""),
            tipo: String(item.tipo ?? "gravacao"),
            data: item.data ? String(item.data) : undefined,
            hora: item.hora ? String(item.hora) : undefined,
          }
        })
        .filter((e) => e.titulo.trim())
    }
  } catch {
    return { ok: false, erro: "Não foi possível ler os eventos." }
  }

  try {
    await salvarEventos(id, eventos)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}
