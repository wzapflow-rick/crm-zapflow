import "server-only"

import { getConteudos } from "@/lib/clientes-db"
import { getMidiasInstagram } from "@/lib/instagram-db"
import { atualizarInteligenciaCliente } from "@/lib/inteligencia-cliente"
import { indexarAcervoSemantico } from "@/lib/busca-semantica"

const MAX_TENTATIVAS = 3
const BACKOFF_INICIAL_MS = 500
const execucoes = new Map<string, Promise<ResultadoAtualizacao>>()

export type ResultadoAtualizacao = {
  ok: boolean
  tentativas: number
  analise: "atualizada" | "falhou"
  embeddings: "atualizados" | "falhou" | "ignorados"
  erro?: string
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mensagemErro(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido"
}

async function tentar<T>(etapa: string, empresaId: string, operacao: () => Promise<T>): Promise<{ valor?: T; tentativas: number; erro?: string }> {
  let erro = "Erro desconhecido"
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
    try {
      console.info("[inteligencia] etapa iniciada", { empresaId, etapa, tentativa })
      const valor = await operacao()
      console.info("[inteligencia] etapa concluída", { empresaId, etapa, tentativa })
      return { valor, tentativas: tentativa }
    } catch (error) {
      erro = mensagemErro(error)
      console.warn("[inteligencia] etapa falhou", { empresaId, etapa, tentativa, erro })
      if (tentativa < MAX_TENTATIVAS) await esperar(BACKOFF_INICIAL_MS * 2 ** (tentativa - 1))
    }
  }
  return { tentativas: MAX_TENTATIVAS, erro }
}

export async function atualizarInteligenciaConfiavel(empresaId: string): Promise<ResultadoAtualizacao> {
  const id = empresaId.trim()
  if (!id) return { ok: false, tentativas: 0, analise: "falhou", embeddings: "ignorados", erro: "Cliente não identificado" }

  const anterior = execucoes.get(id)
  if (anterior) return anterior

  const execucao = (async (): Promise<ResultadoAtualizacao> => {
    const analise = await tentar("analise", id, () => atualizarInteligenciaCliente(id))
    if (analise.erro) {
      return { ok: false, tentativas: analise.tentativas, analise: "falhou", embeddings: "ignorados", erro: analise.erro }
    }

    const embeddings = await tentar("embeddings", id, async () => {
      const [midias, conteudos] = await Promise.all([getMidiasInstagram(id), getConteudos(id)])
      return indexarAcervoSemantico({ empresaId: id, midias, conteudos })
    })

    return {
      ok: true,
      tentativas: analise.tentativas,
      analise: "atualizada",
      embeddings: embeddings.erro ? "falhou" : "atualizados",
      ...(embeddings.erro ? { erro: embeddings.erro } : {}),
    }
  })()

  execucoes.set(id, execucao)
  try {
    return await execucao
  } finally {
    if (execucoes.get(id) === execucao) execucoes.delete(id)
  }
}
