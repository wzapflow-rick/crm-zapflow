"use server"

import { revalidatePath } from "next/cache"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"
import { montarContextoCliente } from "@/lib/contexto-cliente"
import { limparFormatacaoChat } from "@/lib/texto-chat"
import {
  salvarEstrategiaMensal,
  excluirEstrategiaMensal,
  STATUS_ESTRATEGIA_MENSAL,
  type EstrategiaMensalInput,
  type StatusEstrategiaMensal,
} from "@/lib/estrategia-mensal-db"

const MODELO = "gpt-4o"

export type EstadoEstrategiaMensal = { ok: boolean; erro?: string }

// Valida a competência no formato YYYY-MM.
function competenciaValida(valor: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(valor)
}

export async function salvarEstrategiaMensalAction(input: {
  clienteId: string
  competencia: string
  objetivo: string
  pilares: string[]
  campanhas: { nome: string; descricao: string }[]
  kpis: { rotulo: string; alvo: string; realizado: string }[]
  calendarioResumo: string
  retrospectiva: string
  status: string
}): Promise<EstadoEstrategiaMensal> {
  const clienteId = input.clienteId.trim()
  if (!clienteId) return { ok: false, erro: "Cliente não identificado." }
  if (!competenciaValida(input.competencia)) return { ok: false, erro: "Selecione um mês válido." }

  const status = (STATUS_ESTRATEGIA_MENSAL as string[]).includes(input.status)
    ? (input.status as StatusEstrategiaMensal)
    : "planejado"

  const dados: EstrategiaMensalInput = {
    competencia: input.competencia,
    objetivo: input.objetivo,
    pilares: input.pilares,
    campanhas: input.campanhas,
    kpis: input.kpis,
    calendarioResumo: input.calendarioResumo,
    retrospectiva: input.retrospectiva,
    status,
  }

  try {
    await salvarEstrategiaMensal(clienteId, dados)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao salvar."
    return { ok: false, erro: `Não foi possível salvar no banco: ${msg}` }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { ok: true }
}

export async function excluirEstrategiaMensalAction(
  id: string,
  clienteId: string,
): Promise<EstadoEstrategiaMensal> {
  const idLimpo = id.trim()
  const clienteLimpo = clienteId.trim()
  if (!idLimpo || !clienteLimpo) return { ok: false, erro: "Registro não identificado." }
  try {
    await excluirEstrategiaMensal(idLimpo, clienteLimpo)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido ao excluir."
    return { ok: false, erro: `Não foi possível excluir no banco: ${msg}` }
  }
  revalidatePath(`/clientes/${clienteLimpo}`)
  return { ok: true }
}

const schema = z.object({
  objetivo: z
    .string()
    .describe("O objetivo central do mês em uma frase, ligado a uma meta de negócio do cliente (não a vaidade)."),
  pilares: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Pilares de conteúdo do mês: os grandes temas/ângulos que sustentam a estratégia."),
  campanhas: z
    .array(
      z.object({
        nome: z.string().describe("Nome curto da campanha ou série."),
        descricao: z.string().describe("O que é, para que serve e como se conecta ao objetivo, em 1 a 2 frases."),
      }),
    )
    .min(1)
    .max(4)
    .describe("Campanhas ou séries de conteúdo do mês."),
  kpis: z
    .array(
      z.object({
        rotulo: z.string().describe("Nome do indicador (ex.: Alcance mensal, Reuniões qualificadas, Salvamentos)."),
        alvo: z.string().describe("Meta numérica realista para o mês, como texto (ex.: '120000', '8', '5%')."),
      }),
    )
    .min(2)
    .max(5)
    .describe("Indicadores de sucesso do mês, com metas realistas baseadas no histórico disponível."),
  calendarioResumo: z
    .string()
    .describe("Resumo do ritmo de publicação e distribuição no mês (frequência por formato, cadência das campanhas)."),
})

export type EstadoGerarEstrategia =
  | {
      ok: true
      plano: {
        objetivo: string
        pilares: string[]
        campanhas: { nome: string; descricao: string }[]
        kpis: { rotulo: string; alvo: string }[]
        calendarioResumo: string
      }
    }
  | { ok: false; erro: string }

// Gera um rascunho de estratégia mensal a partir de todo o contexto do cliente.
// A equipe revisa e edita antes de salvar; os KPIs vêm só com o alvo (realizado é preenchido depois).
export async function gerarEstrategiaMensalAction(input: {
  clienteId: string
  competencia: string
  instrucao?: string
}): Promise<EstadoGerarEstrategia> {
  const clienteId = input.clienteId.trim()
  if (!clienteId) return { ok: false, erro: "Cliente não identificado." }

  let contextoTexto = ""
  try {
    const contexto = await montarContextoCliente(clienteId, input.instrucao ?? "estratégia mensal")
    contextoTexto = contexto?.texto ?? ""
  } catch (e) {
    console.log("[v0] Falha ao montar contexto da estratégia mensal:", e instanceof Error ? e.message : e)
  }

  try {
    const { object } = await generateObject({
      model: openai(MODELO),
      schema,
      system: `${PERSONA}

# TAREFA: MONTAR A ESTRATÉGIA DO MÊS
Você vai propor a estratégia de marketing de conteúdo de um cliente para um mês específico.
Use o contexto abaixo como direção: segmento, objetivo, estratégia atual, insights, resultados, histórico e conteúdos anteriores.

Regras:
- O objetivo do mês precisa apontar para uma meta de negócio real do cliente.
- Os pilares e campanhas devem ser executáveis por uma equipe pequena.
- Os KPIs precisam ser mensuráveis e com metas realistas com base no histórico; se os dados forem escassos, proponha metas conservadoras e coerentes, sem inventar números do passado.
- Escreva tudo em português do Brasil, em texto simples, sem markdown.

# CONTEXTO DO CLIENTE
${contextoTexto || "Sem contexto estruturado disponível. Use boas práticas para o segmento informado e proponha metas conservadoras."}`,
      prompt: `Monte a estratégia para a competência ${input.competencia}.
${input.instrucao?.trim() ? `Instruções adicionais da equipe: ${input.instrucao.trim()}` : ""}`,
    })

    const limpar = (s: string) => limparFormatacaoChat(s).trim()

    return {
      ok: true,
      plano: {
        objetivo: limpar(object.objetivo),
        pilares: object.pilares.map(limpar).filter(Boolean),
        campanhas: object.campanhas
          .map((c) => ({ nome: limpar(c.nome), descricao: limpar(c.descricao) }))
          .filter((c) => c.nome),
        kpis: object.kpis.map((k) => ({ rotulo: limpar(k.rotulo), alvo: limpar(k.alvo) })).filter((k) => k.rotulo),
        calendarioResumo: limpar(object.calendarioResumo),
      },
    }
  } catch (e) {
    console.log("[v0] Erro ao gerar estratégia mensal:", e instanceof Error ? e.message : e)
    const msg = e instanceof Error ? e.message : "Falha ao gerar a estratégia."
    return {
      ok: false,
      erro:
        msg.includes("model") || msg.includes("does not exist") || msg.includes("access")
          ? `O modelo "${MODELO}" não está disponível nesta conta.`
          : `Não foi possível gerar a estratégia agora. Detalhe: ${msg}`,
    }
  }
}
