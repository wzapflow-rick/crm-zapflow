"use server"

import { revalidatePath } from "next/cache"
import {
  getClientePorToken,
  getConteudos,
  adicionarMensagemCliente,
  atualizarStatusConteudo,
} from "@/lib/clientes-db"
import { adicionarEnvio, normalizarLink } from "@/lib/envios-db"

export type EstadoPortal = { ok: boolean; erro?: string; mensagem?: string }

export async function enviarMensagemPortalAction(
  _prev: EstadoPortal,
  formData: FormData,
): Promise<EstadoPortal> {
  const token = String(formData.get("token") ?? "").trim()
  const texto = String(formData.get("texto") ?? "").trim()
  const autorNome = String(formData.get("autorNome") ?? "").trim()

  if (!token) {
    return { ok: false, erro: "Link inválido." }
  }
  if (!texto) {
    return { ok: false, erro: "Escreva uma mensagem antes de enviar." }
  }

  // Valida o token: só envia se ele corresponder a um cliente real.
  let cliente
  try {
    cliente = await getClientePorToken(token)
  } catch {
    return { ok: false, erro: "Não foi possível validar seu acesso. Tente novamente." }
  }
  if (!cliente) {
    return { ok: false, erro: "Link inválido ou expirado." }
  }

  try {
    await adicionarMensagemCliente(cliente.id, texto, autorNome || cliente.nome)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível enviar: ${msg}` }
  }

  // Sem revalidatePath: o chat atualiza via polling/mutate (SWR), evitando recarregar a página.
  return { ok: true }
}

// O cliente cola um link (Google Drive, WeTransfer, Dropbox, YouTube, etc.) com os
// vídeos/fotos. Guardamos apenas o link — sem custo de armazenamento de arquivos.
export async function enviarMaterialPortalAction(
  _prev: EstadoPortal,
  formData: FormData,
): Promise<EstadoPortal> {
  const token = String(formData.get("token") ?? "").trim()
  const titulo = String(formData.get("titulo") ?? "").trim()
  const linkBruto = String(formData.get("link") ?? "").trim()
  const descricao = String(formData.get("descricao") ?? "").trim()

  if (!token) {
    return { ok: false, erro: "Link inválido." }
  }
  if (!linkBruto) {
    return { ok: false, erro: "Cole o link do material (Google Drive, WeTransfer, etc.)." }
  }

  const link = normalizarLink(linkBruto)
  if (!link) {
    return { ok: false, erro: "Esse link não parece válido. Verifique e cole novamente." }
  }

  let cliente
  try {
    cliente = await getClientePorToken(token)
  } catch {
    return { ok: false, erro: "Não foi possível validar seu acesso. Tente novamente." }
  }
  if (!cliente) {
    return { ok: false, erro: "Link inválido ou expirado." }
  }

  try {
    await adicionarEnvio(cliente.id, { titulo, link, descricao })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível enviar: ${msg}` }
  }

  revalidatePath(`/portal/${token}`)
  return { ok: true }
}

// Aprovação de conteúdo pelo cliente, direto no portal.
// "aprovado": marca a peça como aprovada e avisa a equipe pelo canal de mensagens.
// "ajuste": mantém em aprovação e envia o pedido de ajuste (texto) para a equipe.
export async function aprovarConteudoPortalAction(
  _prev: EstadoPortal,
  formData: FormData,
): Promise<EstadoPortal> {
  const token = String(formData.get("token") ?? "").trim()
  const conteudoId = String(formData.get("conteudoId") ?? "").trim()
  const decisao = String(formData.get("decisao") ?? "").trim()
  const feedback = String(formData.get("feedback") ?? "").trim()

  if (!token || !conteudoId) {
    return { ok: false, erro: "Não foi possível registrar sua resposta." }
  }
  if (decisao !== "aprovado" && decisao !== "ajuste") {
    return { ok: false, erro: "Escolha aprovar ou pedir ajuste." }
  }
  if (decisao === "ajuste" && !feedback) {
    return { ok: false, erro: "Descreva o ajuste que você gostaria de fazer." }
  }

  let cliente
  try {
    cliente = await getClientePorToken(token)
  } catch {
    return { ok: false, erro: "Não foi possível validar seu acesso. Tente novamente." }
  }
  if (!cliente) {
    return { ok: false, erro: "Link inválido ou expirado." }
  }

  // Descobre o título do conteúdo para deixar a mensagem clara para a equipe.
  let titulo = "conteúdo"
  try {
    const conteudos = await getConteudos(cliente.id)
    const alvo = conteudos.find((c) => c.id === conteudoId)
    if (!alvo) {
      return { ok: false, erro: "Conteúdo não encontrado." }
    }
    titulo = alvo.titulo
  } catch {
    return { ok: false, erro: "Não foi possível carregar o conteúdo. Tente novamente." }
  }

  try {
    if (decisao === "aprovado") {
      await atualizarStatusConteudo(cliente.id, conteudoId, "aprovado")
      await adicionarMensagemCliente(
        cliente.id,
        `Aprovei o conteúdo "${titulo}". Pode seguir!`,
        cliente.nome,
      )
    } else {
      await adicionarMensagemCliente(
        cliente.id,
        `Pedido de ajuste no conteúdo "${titulo}": ${feedback}`,
        cliente.nome,
      )
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível registrar: ${msg}` }
  }

  revalidatePath(`/portal/${token}`)
  return {
    ok: true,
    mensagem:
      decisao === "aprovado"
        ? "Conteúdo aprovado! A equipe já foi avisada."
        : "Recebemos seu pedido de ajuste. A equipe já foi avisada.",
  }
}
