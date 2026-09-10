"use server"

import {
  getPendenciaCliente,
  enviarAvisoCliente,
  enviarAvisosPendencias,
  type ResultadoAviso,
} from "@/lib/aviso-pendencias"

export type EnvioAvisoCliente = { ok: boolean; enviado?: boolean; erro?: string; pendentes?: number }

// Botão manual no detalhe do cliente: avisa só aquele cliente na hora.
export async function avisarPendenciasClienteAction(clienteId: string): Promise<EnvioAvisoCliente> {
  const id = clienteId.trim()
  if (!id) {
    return { ok: false, erro: "Cliente não identificado." }
  }

  const cli = await getPendenciaCliente(id)
  if (!cli) {
    return { ok: false, erro: "Cliente não encontrado." }
  }
  if (cli.pendentes <= 0) {
    return { ok: true, enviado: false, pendentes: 0, erro: "Este cliente não tem conteúdos aguardando aprovação." }
  }

  const r = await enviarAvisoCliente(cli)
  if (!r.ok || !r.enviado) {
    return { ok: false, erro: r.motivo || "Não foi possível enviar o aviso.", pendentes: cli.pendentes }
  }
  return { ok: true, enviado: true, pendentes: cli.pendentes }
}

export type EnvioAvisoTodos = {
  ok: boolean
  erro?: string
  total: number
  enviados: number
  falhas: number
  resultados: ResultadoAviso[]
}

// Botão manual em Configurações: checa todos os clientes e avisa os que têm pendências.
export async function avisarTodasPendenciasAction(): Promise<EnvioAvisoTodos> {
  try {
    const resultados = await enviarAvisosPendencias()
    const enviados = resultados.filter((r) => r.enviado).length
    const falhas = resultados.filter((r) => !r.ok || !r.enviado).length
    return { ok: true, total: resultados.length, enviados, falhas, resultados }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: msg, total: 0, enviados: 0, falhas: 0, resultados: [] }
  }
}
