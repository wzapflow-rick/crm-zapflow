import "server-only"

import { generateObject, generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { query } from "@/lib/db"
import { limparFormatacaoChat } from "@/lib/texto-chat"

export const MODELO_CHAT = "gpt-5.4-mini"
const MODELO_AVALIACAO = "gpt-5.4-mini"
const LIMIAR_APROVACAO = 80

const schemaAvaliacao = z.object({
  notaGeral: z.number().min(0).max(100),
  aderenciaContexto: z.number().min(0).max(100),
  suporteFactual: z.number().min(0).max(100),
  separacaoEpistemica: z.number().min(0).max(100),
  tratamentoDadosAusentes: z.number().min(0).max(100),
  utilidadePratica: z.number().min(0).max(100),
  riscoInvencao: z.boolean(),
  problemas: z.array(z.string()).max(8),
  fontes: z.array(z.string()).max(12),
  instrucaoCorrecao: z.string(),
})

export type AvaliacaoResposta = z.infer<typeof schemaAvaliacao>

type VerificacoesDeterministicas = {
  numerosSemApoio: string[]
  temRotuloFato: boolean
  temRotuloInterpretacao: boolean
  temRotuloHipotese: boolean
  mencionaAusenciaDeDados: boolean
}

type ResultadoResposta = {
  respostaFinal: string
  respostaInicial: string
  avaliacaoInicial: AvaliacaoResposta
  avaliacaoFinal: AvaliacaoResposta | null
  verificacoes: VerificacoesDeterministicas
  correcaoAplicada: boolean
  respostaConservadora: boolean
}

function normalizarNumero(valor: string): string {
  return valor.replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")
}

function extrairNumerosRelevantes(texto: string): Set<string> {
  const encontrados = texto.match(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?%?|\b\d{4}\b/g) ?? []
  return new Set(encontrados.map(normalizarNumero))
}

function verificarDeterministicamente(resposta: string, baseFactual: string): VerificacoesDeterministicas {
  const numerosBase = extrairNumerosRelevantes(baseFactual)
  const numerosResposta = [...extrairNumerosRelevantes(resposta)]
  const numerosSemApoio = numerosResposta.filter((numero) => {
    const valor = Number(numero.replace("%", ""))
    if (!numero.includes("%") && valor >= 1 && valor <= 10) return false
    return !numerosBase.has(numero)
  })
  const texto = resposta.toLocaleLowerCase("pt-BR")
  return {
    numerosSemApoio,
    temRotuloFato: /\bfato\s*:/i.test(resposta),
    temRotuloInterpretacao: /\binterpreta(?:ção|cao)\s*:/i.test(resposta),
    temRotuloHipotese: /\bhipótese\s*:|\bhipotese\s*:/i.test(resposta),
    mencionaAusenciaDeDados: /sem dado|dados? (?:insuficiente|indisponível|ausente)|não (?:é possível|há evidência)/i.test(texto),
  }
}

async function avaliar(pergunta: string, contexto: string, resposta: string, verificacoes: VerificacoesDeterministicas) {
  const { object } = await generateObject({
    model: openai(MODELO_AVALIACAO),
    schema: schemaAvaliacao,
    system: `Você audita respostas estratégicas do SIMPLE OS. Seja rigoroso e use somente a pergunta e o contexto fornecidos. Reprove números sem apoio, causalidade não demonstrada, métricas ausentes tratadas como zero e hipóteses apresentadas como fatos. Rótulos Fato, Interpretação e Hipótese são necessários quando a resposta mistura esses níveis, mas não precisam aparecer artificialmente em respostas puramente operacionais. Fontes devem indicar blocos ou registros reconhecíveis do contexto, nunca URLs ou referências inventadas.`,
    prompt: JSON.stringify({ pergunta, contexto, resposta, verificacoes }),
  })
  return object
}

function aprovada(avaliacao: AvaliacaoResposta, verificacoes: VerificacoesDeterministicas): boolean {
  return avaliacao.notaGeral >= LIMIAR_APROVACAO && !avaliacao.riscoInvencao && verificacoes.numerosSemApoio.length === 0
}

function respostaConservadora(pergunta: string, problemas: string[]): string {
  const limitacoes = problemas.slice(0, 3).join("; ") || "as evidências disponíveis não sustentam uma conclusão segura"
  return `Não consigo responder com segurança a esta pergunta usando apenas os dados disponíveis do cliente. As principais limitações são: ${limitacoes}.\n\nRecomendo atualizar ou ampliar os dados do período e refazer a pergunta para que a análise diferencie fatos observados, interpretações e hipóteses.`
}

async function salvarAuditoria(input: {
  empresaId: string
  pergunta: string
  resultado: ResultadoResposta
}) {
  const fontes = input.resultado.avaliacaoFinal?.fontes ?? input.resultado.avaliacaoInicial.fontes
  const problemas = input.resultado.avaliacaoFinal?.problemas ?? input.resultado.avaliacaoInicial.problemas
  await query(
    `insert into public.cliente_resposta_ia_avaliacao
      (empresa_id, pergunta, resposta_inicial, resposta_final, avaliacao_inicial, avaliacao_final,
       verificacoes_deterministicas, fontes, problemas, correcao_aplicada, resposta_conservadora,
       modelo_geracao, modelo_avaliacao)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13)`,
    [
      input.empresaId,
      input.pergunta,
      input.resultado.respostaInicial,
      input.resultado.respostaFinal,
      JSON.stringify(input.resultado.avaliacaoInicial),
      input.resultado.avaliacaoFinal ? JSON.stringify(input.resultado.avaliacaoFinal) : null,
      JSON.stringify(input.resultado.verificacoes),
      JSON.stringify(fontes),
      JSON.stringify(problemas),
      input.resultado.correcaoAplicada,
      input.resultado.respostaConservadora,
      MODELO_CHAT,
      MODELO_AVALIACAO,
    ],
  )
}

export async function avaliarECorrigirResposta(input: {
  empresaId: string
  pergunta: string
  contexto: string
  respostaInicial: string
}): Promise<ResultadoResposta> {
  const baseFactual = `${input.pergunta}\n${input.contexto}`
  const respostaInicialLimpa = limparFormatacaoChat(input.respostaInicial)
  const verificacoes = verificarDeterministicamente(respostaInicialLimpa, baseFactual)
  let avaliacaoInicial: AvaliacaoResposta

  try {
    avaliacaoInicial = await avaliar(input.pergunta, input.contexto, respostaInicialLimpa, verificacoes)
  } catch (error) {
    console.warn("[avaliacao-ia] avaliação indisponível; resposta conservadora aplicada", {
      empresaId: input.empresaId,
      erro: error instanceof Error ? error.message : "erro desconhecido",
    })
    const resultado: ResultadoResposta = {
      respostaInicial: input.respostaInicial,
      respostaFinal: respostaConservadora(input.pergunta, ["não foi possível validar automaticamente a resposta"]),
      avaliacaoInicial: {
        notaGeral: 0,
        aderenciaContexto: 0,
        suporteFactual: 0,
        separacaoEpistemica: 0,
        tratamentoDadosAusentes: 0,
        utilidadePratica: 0,
        riscoInvencao: true,
        problemas: ["Avaliação automática indisponível"],
        fontes: [],
        instrucaoCorrecao: "Responder de forma conservadora",
      },
      avaliacaoFinal: null,
      verificacoes,
      correcaoAplicada: true,
      respostaConservadora: true,
    }
    await salvarAuditoria({ empresaId: input.empresaId, pergunta: input.pergunta, resultado }).catch(() => {})
    return resultado
  }

  if (aprovada(avaliacaoInicial, verificacoes)) {
    const resultado: ResultadoResposta = {
      respostaInicial: input.respostaInicial,
      respostaFinal: respostaInicialLimpa,
      avaliacaoInicial,
      avaliacaoFinal: null,
      verificacoes,
      correcaoAplicada: false,
      respostaConservadora: false,
    }
    await salvarAuditoria({ empresaId: input.empresaId, pergunta: input.pergunta, resultado }).catch(() => {})
    return resultado
  }

  let respostaCorrigida: string
  let revisaoFalhou = false
  try {
    const revisao = await generateText({
      model: openai(MODELO_CHAT),
      system: `Reescreva a resposta estratégica usando somente a pergunta e o contexto. Corrija todos os problemas apontados. Preserve o que for útil, remova números sem apoio e causalidade não demonstrada. Quando aplicável, separe explicitamente Fato, Interpretação e Hipótese. Se faltarem dados, declare a limitação. Entregue somente texto simples em parágrafos curtos, sem Markdown, hashtags, asteriscos, cerquilhas, tabelas ou marcadores com símbolos. Se precisar enumerar, use números seguidos de ponto. Não mencione esta auditoria nem o processo de correção.`,
      prompt: JSON.stringify({
        pergunta: input.pergunta,
        contexto: input.contexto,
        respostaInicial: input.respostaInicial,
        problemas: [...avaliacaoInicial.problemas, ...verificacoes.numerosSemApoio.map((numero) => `Número sem apoio: ${numero}`)],
        instrucaoCorrecao: avaliacaoInicial.instrucaoCorrecao,
      }),
    })
    respostaCorrigida = limparFormatacaoChat(revisao.text)
  } catch (error) {
    console.warn("[avaliacao-ia] revisão indisponível; resposta conservadora aplicada", {
      empresaId: input.empresaId,
      erro: error instanceof Error ? error.message : "erro desconhecido",
    })
    revisaoFalhou = true
    respostaCorrigida = respostaConservadora(input.pergunta, avaliacaoInicial.problemas)
  }
  const verificacoesFinais = verificarDeterministicamente(respostaCorrigida, baseFactual)
  let avaliacaoFinal: AvaliacaoResposta | null = null
  try {
    avaliacaoFinal = await avaliar(input.pergunta, input.contexto, respostaCorrigida, verificacoesFinais)
  } catch {}
  const passou = !revisaoFalhou && avaliacaoFinal ? aprovada(avaliacaoFinal, verificacoesFinais) : false
  const problemasFinais = avaliacaoFinal?.problemas ?? avaliacaoInicial.problemas
  const resultado: ResultadoResposta = {
    respostaInicial: input.respostaInicial,
    respostaFinal: passou ? respostaCorrigida : respostaConservadora(input.pergunta, problemasFinais),
    avaliacaoInicial,
    avaliacaoFinal,
    verificacoes: verificacoesFinais,
    correcaoAplicada: true,
    respostaConservadora: !passou,
  }
  await salvarAuditoria({ empresaId: input.empresaId, pergunta: input.pergunta, resultado }).catch((error) => {
    console.warn("[avaliacao-ia] auditoria não persistida", {
      empresaId: input.empresaId,
      erro: error instanceof Error ? error.message : "erro desconhecido",
    })
  })
  return resultado
}
