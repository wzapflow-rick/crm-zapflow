import "server-only"

import { getConteudos } from "@/lib/clientes-db"
import { getMidiasInstagram } from "@/lib/instagram-db"
import { getReunioes } from "@/lib/reunioes-db"
import { getExperimentos } from "@/lib/experimentos-db"
import { getPerformance } from "@/lib/performance-db"
import { getMemoria } from "@/lib/memoria-db"
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
      const [midias, conteudos, reunioes, experimentos, performance, memoriaMapa] = await Promise.all([
        getMidiasInstagram(id),
        getConteudos(id),
        getReunioes(id),
        getExperimentos(id),
        getPerformance(id),
        getMemoria(id),
      ])
      const memoria = Object.entries(memoriaMapa).map(([secao, conteudo]) => ({ secao, conteudo }))
      // Reindexa o acervo completo do cliente (Instagram, conteúdos, reuniões,
      // experimentos, performance e memória) e poda embeddings internos obsoletos.
      return indexarAcervoSemantico(
        { empresaId: id, midias, conteudos, reunioes, experimentos, performance, memoria },
        { podarObsoletos: true },
      )
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

// Agendamento em segundo plano: mudanças em roteiros, performance, experimentos,
// reuniões e memória disparam a atualização sem bloquear a resposta da action.
// O debounce por cliente colapsa edições em rajada em uma única reanálise.
const DEBOUNCE_MS = 4000

type AgendamentoInteligencia = { timer: ReturnType<typeof setTimeout> | null; rodando: boolean; repetir: boolean }
const agendamentos = new Map<string, AgendamentoInteligencia>()

async function dispararAgendamento(id: string): Promise<void> {
  const estado = agendamentos.get(id)
  if (!estado) return
  if (estado.rodando) {
    // Já há uma execução em andamento; marca para repetir e capturar as mudanças mais recentes.
    estado.repetir = true
    return
  }
  estado.rodando = true
  try {
    const resultado = await atualizarInteligenciaConfiavel(id)
    if (!resultado.ok) {
      console.warn("[inteligencia] atualização automática não concluída", { empresaId: id, erro: resultado.erro })
    }
  } catch (error) {
    console.warn("[inteligencia] atualização automática falhou", { empresaId: id, erro: mensagemErro(error) })
  } finally {
    const atual = agendamentos.get(id)
    if (atual) {
      atual.rodando = false
      if (atual.repetir) {
        atual.repetir = false
        agendarAtualizacaoInteligencia(id)
      }
    }
  }
}

export function agendarAtualizacaoInteligencia(empresaId: string): void {
  const id = empresaId.trim()
  if (!id) return
  const estado = agendamentos.get(id) ?? { timer: null, rodando: false, repetir: false }
  if (estado.timer) clearTimeout(estado.timer)
  estado.timer = setTimeout(() => {
    estado.timer = null
    void dispararAgendamento(id)
  }, DEBOUNCE_MS)
  agendamentos.set(id, estado)
}
