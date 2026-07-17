"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  adicionarMensagemEquipe,
  atualizarBanner,
  atualizarCliente,
  criarCliente,
  excluirCliente,
  salvarArquivos,
  salvarConteudos,
  salvarEstrategia,
  salvarEventos,
  salvarMensagens,
  salvarResultados,
  salvarVisaoGeral,
  type ArquivoInput,
  type AtualizarCliente,
  type ConteudoInput,
  type EventoInput,
  type MensagemInput,
  type MetaInput,
  type NovoCliente,
  type ResultadoInput,
} from "@/lib/clientes-db"
import type { StatusCliente } from "@/lib/simple-data"

export type EstadoForm = { ok: boolean; erro?: string }

// Salva/remove o banner (capa) do cliente. Chamada direto do perfil do cliente.
export async function atualizarBannerAction(clienteId: string, bannerUrl: string): Promise<EstadoForm> {
  const id = clienteId.trim()
  if (!id) return { ok: false, erro: "Cliente não identificado." }
  try {
    await atualizarBanner(id, bannerUrl)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível salvar o banner: ${msg}` }
  }
  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

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
    recorrente: formData.get("recorrente") === "on",
    logoUrl: String(formData.get("logoUrl") ?? "") || undefined,
    desde: String(formData.get("desde") ?? "") || undefined,
    responsaveisIds: formData.getAll("responsaveisIds").map(String).filter(Boolean),
  }

  try {
    await criarCliente(dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath("/clientes")
  revalidatePath("/marketing")
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
    recorrente: formData.get("recorrente") === "on",
    logoUrl: String(formData.get("logoUrl") ?? ""),
    desde: String(formData.get("desde") ?? "") || undefined,
    responsaveisIds: formData.getAll("responsaveisIds").map(String).filter(Boolean),
  }

  try {
    await atualizarCliente(id, dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível atualizar no banco: ${msg}` }
  }

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  revalidatePath("/marketing")
  return { ok: true }
}

export async function excluirClienteAction(id: string, redirectTo?: string): Promise<EstadoForm> {
  const clienteId = id.trim()
  if (!clienteId) {
    return { ok: false, erro: "Cliente não identificado." }
  }
  try {
    await excluirCliente(clienteId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao excluir."
    return { ok: false, erro: `Não foi possível excluir no banco: ${msg}` }
  }
  revalidatePath("/clientes")
  revalidatePath("/marketing")
  // Quando a exclusão parte da página de detalhe (/clientes/[id]), redirecionamos
  // no servidor para evitar que a rota atual re-renderize e dispare notFound() (tela 404).
  if (redirectTo) {
    redirect(redirectTo)
  }
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
            id: item.id ? String(item.id) : undefined,
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

export async function salvarConteudosAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }

  let conteudos: ConteudoInput[] = []
  try {
    const bruto = String(formData.get("conteudos") ?? "[]")
    const parsed = JSON.parse(bruto) as unknown
    if (Array.isArray(parsed)) {
      conteudos = parsed
        .map((c) => {
          const item = c as Record<string, unknown>
          return {
            titulo: String(item.titulo ?? ""),
            formato: String(item.formato ?? "Reels"),
            status: String(item.status ?? "ideia"),
            data: item.data ? String(item.data) : undefined,
            roteiro: item.roteiro ? String(item.roteiro) : undefined,
          }
        })
        .filter((c) => c.titulo.trim())
    }
  } catch {
    return { ok: false, erro: "Não foi possível ler os conteúdos." }
  }

  try {
    await salvarConteudos(id, conteudos)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

// Converte um textarea (uma linha por item) em lista limpa.
function linhasParaLista(valor: string): string[] {
  return valor
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function salvarEstrategiaAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }

  const estrategia = {
    estrategiaAtual: linhasParaLista(String(formData.get("estrategiaAtual") ?? "")),
    insights: linhasParaLista(String(formData.get("insights") ?? "")),
    concorrentes: linhasParaLista(String(formData.get("concorrentes") ?? "")),
  }

  try {
    await salvarEstrategia(id, estrategia)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

export async function salvarArquivosAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }

  let arquivos: ArquivoInput[] = []
  try {
    const parsed = JSON.parse(String(formData.get("arquivos") ?? "[]")) as unknown
    if (Array.isArray(parsed)) {
      arquivos = parsed
        .map((a) => {
          const item = a as Record<string, unknown>
          return {
            nome: String(item.nome ?? ""),
            tipo: String(item.tipo ?? "Material"),
            url: item.url ? String(item.url) : undefined,
          }
        })
        .filter((a) => a.nome.trim())
    }
  } catch {
    return { ok: false, erro: "Não foi possível ler os arquivos." }
  }

  try {
    await salvarArquivos(id, arquivos)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

export async function salvarMensagensAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }

  let mensagens: MensagemInput[] = []
  try {
    const parsed = JSON.parse(String(formData.get("mensagens") ?? "[]")) as unknown
    if (Array.isArray(parsed)) {
      mensagens = parsed
        .map((m) => {
          const item = m as Record<string, unknown>
          return {
            autorId: item.autorId ? String(item.autorId) : undefined,
            texto: String(item.texto ?? ""),
            data: item.data ? String(item.data) : undefined,
          }
        })
        .filter((m) => m.texto.trim())
    }
  } catch {
    return { ok: false, erro: "Não foi possível ler as mensagens." }
  }

  try {
    await salvarMensagens(id, mensagens)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}

// Envio de mensagem pela equipe no chat do cliente (append-only). Vira resposta da SIMPLE
// visível no portal do cliente.
export async function enviarMensagemEquipeAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }
  const texto = String(formData.get("texto") ?? "").trim()
  if (!texto) {
    return { ok: false, erro: "Escreva uma mensagem antes de enviar." }
  }
  const autorId = String(formData.get("autorId") ?? "").trim() || null

  try {
    await adicionarMensagemEquipe(id, autorId, texto)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao enviar."
    return { ok: false, erro: `Não foi possível enviar: ${msg}` }
  }

  // Sem revalidatePath: o chat atualiza via polling/mutate (SWR), evitando recarregar a página.
  return { ok: true }
}

export async function salvarResultadosAction(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }

  let resultados: ResultadoInput[] = []
  try {
    const parsed = JSON.parse(String(formData.get("resultados") ?? "[]")) as unknown
    if (Array.isArray(parsed)) {
      resultados = parsed
        .map((r) => {
          const item = r as Record<string, unknown>
          return {
            rotulo: String(item.rotulo ?? ""),
            valor: String(item.valor ?? ""),
            variacao: Number(item.variacao) || 0,
          }
        })
        .filter((r) => r.rotulo.trim())
    }
  } catch {
    return { ok: false, erro: "Não foi possível ler os resultados." }
  }

  try {
    await salvarResultados(id, resultados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath(`/clientes/${id}`)
  return { ok: true }
}
