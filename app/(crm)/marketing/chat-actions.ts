"use server"

import { montarContextoCliente, type ResumoContexto } from "@/lib/contexto-cliente"
import { getChatMensagens, limparChat, type ChatMensagem } from "@/lib/chat-db"

export type DadosClienteChat = {
  resumo: ResumoContexto | null
  mensagens: ChatMensagem[]
  erro?: string
}

// Carrega o resumo de contexto + o histórico salvo do chat de um cliente.
export async function carregarChatClienteAction(empresaId: string): Promise<DadosClienteChat> {
  try {
    const [contexto, mensagens] = await Promise.all([
      montarContextoCliente(empresaId),
      getChatMensagens(empresaId).catch(() => []),
    ])
    return { resumo: contexto?.resumo ?? null, mensagens }
  } catch (e) {
    console.log("[v0] erro ao carregar chat do cliente:", (e as Error).message)
    return { resumo: null, mensagens: [], erro: "Não foi possível carregar o contexto deste cliente." }
  }
}

export async function limparChatAction(empresaId: string): Promise<{ ok: boolean }> {
  try {
    await limparChat(empresaId)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
