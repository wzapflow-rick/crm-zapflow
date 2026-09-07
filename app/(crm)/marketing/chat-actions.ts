"use server"

import { montarContextoCliente, type ResumoContexto } from "@/lib/contexto-cliente"
import { getChatMensagens, limparChat, type ChatMensagem } from "@/lib/chat-db"
import {
  getFeedbackDaEmpresa,
  hashResposta,
  registrarFeedback,
  removerFeedback,
  ehTipoFeedback,
  type TipoFeedback,
} from "@/lib/feedback-ia-db"

export type DadosClienteChat = {
  resumo: ResumoContexto | null
  mensagens: ChatMensagem[]
  erro?: string
}

// Carrega o resumo de contexto + o histórico salvo do chat de um cliente,
// já anexando o feedback humano registrado em cada resposta da IA.
export async function carregarChatClienteAction(empresaId: string): Promise<DadosClienteChat> {
  try {
    const [contexto, mensagens, feedbacks] = await Promise.all([
      montarContextoCliente(empresaId),
      getChatMensagens(empresaId).catch(() => []),
      getFeedbackDaEmpresa(empresaId).catch(() => ({}) as Record<string, TipoFeedback>),
    ])
    const mensagensComFeedback = mensagens.map((m) =>
      m.papel === "assistant" ? { ...m, feedback: feedbacks[hashResposta(m.texto)] ?? null } : m,
    )
    return { resumo: contexto?.resumo ?? null, mensagens: mensagensComFeedback }
  } catch (e) {
    console.log("[v0] erro ao carregar chat do cliente:", (e as Error).message)
    return { resumo: null, mensagens: [], erro: "Não foi possível carregar o contexto deste cliente." }
  }
}

// Registra, atualiza ou remove o feedback humano de uma resposta da IA.
// Passar avaliacao = null remove o feedback existente (usuário desmarcou).
export async function registrarFeedbackAction(input: {
  empresaId: string
  resposta: string
  pergunta: string
  avaliacao: TipoFeedback | null
}): Promise<{ ok: boolean }> {
  try {
    if (!input.empresaId || !input.resposta.trim()) return { ok: false }
    if (input.avaliacao === null) {
      await removerFeedback(input.empresaId, input.resposta)
      return { ok: true }
    }
    if (!ehTipoFeedback(input.avaliacao)) return { ok: false }
    await registrarFeedback(input.empresaId, input.resposta, input.pergunta, input.avaliacao)
    return { ok: true }
  } catch (e) {
    console.log("[v0] erro ao registrar feedback:", (e as Error).message)
    return { ok: false }
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
