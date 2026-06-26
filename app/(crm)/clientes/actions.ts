"use server"

import { revalidatePath } from "next/cache"
import { criarCliente, type NovoCliente } from "@/lib/clientes-db"
import type { StatusCliente } from "@/lib/simple-data"

export type EstadoForm = { ok: boolean; erro?: string }

export async function criarClienteAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim()
  if (!nome) {
    return { ok: false, erro: "Informe o nome do cliente." }
  }

  const mrrBruto = String(formData.get("mrr") ?? "").replace(/\./g, "").replace(",", ".")
  const mrr = mrrBruto ? Number(mrrBruto) : 0

  const dados: NovoCliente = {
    nome,
    segmento: String(formData.get("segmento") ?? "") || undefined,
    status: (String(formData.get("status") ?? "onboarding") as StatusCliente) || undefined,
    objetivo: String(formData.get("objetivo") ?? "") || undefined,
    contato: String(formData.get("contato") ?? "") || undefined,
    telefone: String(formData.get("telefone") ?? "") || undefined,
    mrr: Number.isFinite(mrr) ? mrr : 0,
    desde: String(formData.get("desde") ?? "") || undefined,
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
