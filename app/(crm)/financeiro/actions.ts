"use server"

import { revalidatePath } from "next/cache"
import {
  atualizarLancamento,
  criarLancamento,
  excluirLancamento,
  salvarMeta,
  type LancamentoInput,
} from "@/lib/financeiro-db"

export type EstadoForm = { ok: boolean; erro?: string }

// Converte "1.234,56" ou "1234.56" em número
function lerValor(bruto: string): number {
  const limpo = bruto.trim().replace(/\s|R\$/g, "")
  // Se tem vírgula, assume formato brasileiro (ponto = milhar, vírgula = decimal)
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : Number.NaN
}

function lerLancamento(formData: FormData): LancamentoInput {
  const recorrente = String(formData.get("recorrente") ?? "") === "on" || String(formData.get("recorrente") ?? "") === "true"
  return {
    tipo: String(formData.get("tipo") ?? "custo") === "receita" ? "receita" : "custo",
    descricao: String(formData.get("descricao") ?? ""),
    categoria: String(formData.get("categoria") ?? ""),
    valor: lerValor(String(formData.get("valor") ?? "")),
    recorrente,
    competencia: recorrente ? null : String(formData.get("competencia") ?? "") || null,
    empresaId: String(formData.get("empresaId") ?? ""),
  }
}

export async function criarLancamentoAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const dados = lerLancamento(formData)
  if (!dados.descricao.trim()) return { ok: false, erro: "Informe a descrição do lançamento." }
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) return { ok: false, erro: "Informe um valor válido." }
  if (!dados.recorrente && !dados.competencia) return { ok: false, erro: "Selecione o mês de competência." }
  try {
    await criarLancamento(dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }
  revalidatePath("/financeiro")
  revalidatePath("/")
  return { ok: true }
}

export async function atualizarLancamentoAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) return { ok: false, erro: "Lançamento não identificado." }
  const dados = lerLancamento(formData)
  if (!dados.descricao.trim()) return { ok: false, erro: "Informe a descrição do lançamento." }
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) return { ok: false, erro: "Informe um valor válido." }
  if (!dados.recorrente && !dados.competencia) return { ok: false, erro: "Selecione o mês de competência." }
  try {
    await atualizarLancamento(id, dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }
  revalidatePath("/financeiro")
  revalidatePath("/")
  return { ok: true }
}

export async function excluirLancamentoAction(id: string): Promise<EstadoForm> {
  if (!id) return { ok: false, erro: "Lançamento não identificado." }
  try {
    await excluirLancamento(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao excluir."
    return { ok: false, erro: msg }
  }
  revalidatePath("/financeiro")
  revalidatePath("/")
  return { ok: true }
}

// Salva a meta de um mês ("YYYY-MM")
export async function salvarMetaAction(mes: string, valor: number): Promise<EstadoForm> {
  if (!mes) return { ok: false, erro: "Mês não identificado." }
  if (!Number.isFinite(valor) || valor < 0) return { ok: false, erro: "Informe um valor de meta válido." }
  try {
    await salvarMeta(mes, valor)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar a meta."
    return { ok: false, erro: `Não foi possível salvar a meta: ${msg}` }
  }
  revalidatePath("/financeiro")
  revalidatePath("/")
  return { ok: true }
}
