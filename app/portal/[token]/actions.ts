"use server"

import { revalidatePath } from "next/cache"
import {
  getClientePorToken,
  getConteudos,
  adicionarMensagemCliente,
  atualizarStatusConteudo,
  registrarPedidoAjuste,
} from "@/lib/clientes-db"
import { adicionarEnvio, normalizarLink } from "@/lib/envios-db"
import { enviarTextoWhatsApp } from "@/lib/whatsapp"

// Aviso no grupo da SIMPLE. Falha no WhatsApp não pode impedir o registro do
// pedido: o status "ajuste" e o alerta do painel já garantem que a equipe veja.
async function avisarEquipeAjuste(empresaId: string, clienteNome: string, titulo: string, feedback: string) {
  const grupo = process.env.SOCIOS_GROUP_ID
  if (!grupo) return
  const resumo = feedback.length > 600 ? `${feedback.slice(0, 600)}...` : feedback
  const texto = `*Pedido de ajuste* - ${clienteNome}\nConteúdo: "${titulo}"\n\n${resumo}\n\nO conteúdo saiu de aprovação e está marcado como *Ajustar* no CRM.`
  try {
    const r = await enviarTextoWhatsApp(grupo, texto, "grupo")
    if (!r.ok) console.error("[portal] aviso de ajuste não enviado:", r.status, empresaId)
  } catch (e) {
    console.error("[portal] aviso de ajuste falhou:", e instanceof Error ? e.message : e)
  }
}

export type EstadoPortal = { ok: boolean; erro?: string; mensagem?: string }

// O portal é público (acesso por link): limites evitam que um link vazado
// seja usado para encher o banco com textos gigantes.
const LIMITE_TEXTO = 4000
const LIMITE_CURTO = 200
const ERRO_TAMANHO = { ok: false, erro: "Texto muito longo. Resuma e tente novamente." } as const

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
  if (texto.length > LIMITE_TEXTO || autorNome.length > LIMITE_CURTO) return ERRO_TAMANHO

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
    console.error("[portal] falha:", e instanceof Error ? e.message : e)
    return { ok: false, erro: "Não foi possível enviar agora. Tente novamente em instantes." }
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
  if (linkBruto.length > 2048 || titulo.length > LIMITE_CURTO || descricao.length > LIMITE_TEXTO) {
    return ERRO_TAMANHO
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
    console.error("[portal] falha:", e instanceof Error ? e.message : e)
    return { ok: false, erro: "Não foi possível enviar agora. Tente novamente em instantes." }
  }

  revalidatePath(`/portal/${token}`)
  return { ok: true }
}

// Aprovação de conteúdo pelo cliente, direto no portal.
// "aprovado": marca a peça como aprovada e avisa a equipe pelo canal de mensagens.
// "ajuste": tira de aprovação (status "ajuste"), para os lembretes de aprovação,
// guarda o pedido no conteúdo e avisa a equipe no chat e no grupo do WhatsApp.
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
  if (feedback.length > LIMITE_TEXTO) return ERRO_TAMANHO

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
      await registrarPedidoAjuste(cliente.id, conteudoId, feedback)
      await adicionarMensagemCliente(
        cliente.id,
        `Pedido de ajuste no conteúdo "${titulo}": ${feedback}`,
        cliente.nome,
      )
      await avisarEquipeAjuste(cliente.id, cliente.nome, titulo, feedback)
    }
  } catch (e) {
    console.error("[portal] falha:", e instanceof Error ? e.message : e)
    return { ok: false, erro: "Não foi possível registrar agora. Tente novamente em instantes." }
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
