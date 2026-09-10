"use server"

import { revalidatePath } from "next/cache"
import { excluirPerformance } from "@/lib/performance-db"
import { agendarAtualizacaoInteligencia } from "@/lib/atualizacao-inteligencia"

export type EstadoPerformance = { ok: boolean; erro?: string }

export async function excluirPerformanceAction(
  _prev: EstadoPerformance,
  formData: FormData,
): Promise<EstadoPerformance> {
  const id = String(formData.get("id") ?? "").trim()
  const empresaId = String(formData.get("empresaId") ?? "").trim()
  if (!id || !empresaId) return { ok: false, erro: "Conteúdo inválido." }
  try {
    await excluirPerformance(id, empresaId)
  } catch (e) {
    console.error("[v0] Erro ao excluir performance:", e)
    return { ok: false, erro: "Não foi possível excluir o conteúdo." }
  }
  agendarAtualizacaoInteligencia(empresaId)
  revalidatePath(`/clientes/${empresaId}`)
  return { ok: true }
}
