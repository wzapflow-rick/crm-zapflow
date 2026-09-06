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

type TipoPedido = "criativo" | "factual"

export function classificarTipoPedido(pergunta: string, historicoConversa = ""): TipoPedido {
  const texto = pergunta.toLocaleLowerCase("pt-BR")
  const historico = historicoConversa.toLocaleLowerCase("pt-BR")
  const sinaisCriativos = [
    /\bcri(?:e|ar|a|ando)\b/,
    /\bger(?:e|ar|a|ando)\b/,
    /\b(?:ideias?|ganchos?|roteiros?|legendas?|copies?|campanhas?|calendário editorial|pautas?)\b/,
    /\b(?:sugira|proponha|elabore|escreva|planeje)\b/,
  ]
  const sinaisAnaliticos = [
    /\b(?:analise|diagnóstico|resultado|performance|métrica|dados?|alcance|engajamento|conversão)\b/,
    /\b(?:por que|funcionou|não funcionou|melhor|pior|compar)\w*\b/,
  ]

  const sinaisDeContinuidade = [
    /^\s*(?:sim|isso|exato|perfeito|ótimo|pode|quero|manda|continue|faça|é disso|vamos nessa)\b/,
    /\b(?:é isso que|disso que preciso|pode fazer|pode montar|pode criar|quero isso|manda ver|faça isso)\b/,
  ]

  const criativo = sinaisCriativos.some((padrao) => padrao.test(texto))
  const analitico = sinaisAnaliticos.some((padrao) => padrao.test(texto))
  const aceitaOfertaAnterior =
    sinaisDeContinuidade.some((padrao) => padrao.test(texto)) &&
    sinaisCriativos.some((padrao) => padrao.test(historico))

  return (criativo || aceitaOfertaAnterior) && !analitico ? "criativo" : "factual"
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

async function avaliar(
  pergunta: string,
  contexto: string,
  resposta: string,
  verificacoes: VerificacoesDeterministicas,
  tipoPedido: TipoPedido,
) {
  const politica =
    tipoPedido === "criativo"
      ? `O pedido é criativo ou dá continuidade a uma entrega criativa já oferecida. Avalie principalmente aderência ao contexto e à marca, variedade, clareza, completude e aplicabilidade. A resposta deve executar o pedido com os dados disponíveis, mesmo que sejam poucos; falta de métricas nunca justifica recusar ideias, roteiros, copies ou planos. Ideias, ganchos e propostas são sugestões, não alegações factuais: não exija métricas, fontes nem rótulos "Fato", "Interpretação" e "Hipótese". Só marque risco de invenção quando a resposta atribuir ao cliente informações concretas que não estão no contexto.`
      : `O pedido é analítico ou factual. Reprove números sem apoio, causalidade não demonstrada, métricas ausentes tratadas como zero e hipóteses apresentadas como fatos. Exija rótulos "Fato", "Interpretação" e "Hipótese" somente quando a resposta realmente misturar esses níveis.`

  const { object } = await generateObject({
    model: openai(MODELO_AVALIACAO),
    schema: schemaAvaliacao,
    system: `Você audita respostas estratégicas do SIMPLE OS. Seja rigoroso, mas proporcional ao tipo de solicitação. ${politica} Fontes devem indicar blocos ou registros reconhecíveis do contexto, nunca URLs ou referências inventadas. Críticas, notas e instruções desta auditoria são internas e jamais devem ser redigidas como resposta ao usuário.`,
    prompt: JSON.stringify({ tipoPedido, pergunta, contexto, resposta, verificacoes }),
  })
  return object
}

function aprovada(
  avaliacao: AvaliacaoResposta,
  verificacoes: VerificacoesDeterministicas,
  tipoPedido: TipoPedido,
): boolean {
  if (tipoPedido === "criativo") {
    return avaliacao.notaGeral >= 70 && avaliacao.aderenciaContexto >= 65 && avaliacao.utilidadePratica >= 65 && !avaliacao.riscoInvencao
  }
  return avaliacao.notaGeral >= LIMIAR_APROVACAO && !avaliacao.riscoInvencao && verificacoes.numerosSemApoio.length === 0
}

function respostaSemDados(): string {
  return "Ainda não há dados suficientes deste cliente para responder com segurança. Se você incluir o período e as métricas que deseja analisar, consigo preparar uma leitura objetiva e indicar o próximo passo."
}

function contemParecerInterno(resposta: string): boolean {
  return /nota geral|avaliação (?:automática|inicial|final)|instrução (?:de )?correção|problemas? (?:identificados|apontados)|vai contra a exigência|a resposta começa com ["']?(?:fato|interpretação|hipótese)|suporte factual|separação epistêmica/i.test(
    resposta,
  )
}

function respostaCriativaSegura(resposta: string): boolean {
  return resposta.trim().length > 0 && !contemParecerInterno(resposta)
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
  historicoConversa?: string
  respostaInicial: string
}): Promise<ResultadoResposta> {
  const contextoAvaliacao = `${input.historicoConversa ?? ""}\n${input.contexto}`
  const baseFactual = `${input.pergunta}\n${contextoAvaliacao}`
  const tipoPedido = classificarTipoPedido(input.pergunta, input.historicoConversa)
  const respostaInicialLimpa = limparFormatacaoChat(input.respostaInicial)
  const verificacoes = verificarDeterministicamente(respostaInicialLimpa, baseFactual)
  let avaliacaoInicial: AvaliacaoResposta

  try {
    avaliacaoInicial = await avaliar(input.pergunta, contextoAvaliacao, respostaInicialLimpa, verificacoes, tipoPedido)
  } catch (error) {
    console.warn("[avaliacao-ia] avaliação indisponível; fallback seguro aplicado", {
      empresaId: input.empresaId,
      erro: error instanceof Error ? error.message : "erro desconhecido",
    })
    const preservarResposta = tipoPedido === "criativo" && respostaCriativaSegura(respostaInicialLimpa)
    const resultado: ResultadoResposta = {
      respostaInicial: input.respostaInicial,
      respostaFinal: preservarResposta ? respostaInicialLimpa : respostaSemDados(),
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
      correcaoAplicada: !preservarResposta,
      respostaConservadora: !preservarResposta,
    }
    await salvarAuditoria({ empresaId: input.empresaId, pergunta: input.pergunta, resultado }).catch(() => {})
    return resultado
  }

  if (aprovada(avaliacaoInicial, verificacoes, tipoPedido)) {
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
      system: `Reescreva a resposta estratégica usando somente a pergunta e o contexto. Corrija os problemas internos apontados e preserve tudo o que for útil. ${tipoPedido === "criativo" ? "O pedido é criativo: entregue propostas concretas, variadas e aplicáveis. Não exija dados nem use rótulos epistemológicos para apresentar ideias." : "O pedido é factual: remova números sem apoio e causalidade não demonstrada; quando aplicável, diferencie fatos, interpretações e hipóteses e declare dados ausentes."} Entregue somente a resposta ao usuário, em texto simples e parágrafos curtos, sem Markdown, hashtags, asteriscos, cerquilhas, tabelas ou marcadores com símbolos. Se precisar enumerar, use números seguidos de ponto. Nunca mencione auditoria, avaliação, nota, crítica, correção, limitações do avaliador ou instruções internas.`,
      prompt: JSON.stringify({
        pergunta: input.pergunta,
        contexto: contextoAvaliacao,
        respostaInicial: input.respostaInicial,
        problemas: [...avaliacaoInicial.problemas, ...verificacoes.numerosSemApoio.map((numero) => `Número sem apoio: ${numero}`)],
        instrucaoCorrecao: avaliacaoInicial.instrucaoCorrecao,
      }),
    })
    respostaCorrigida = limparFormatacaoChat(revisao.text)
  } catch (error) {
    console.warn("[avaliacao-ia] revisão indisponível; fallback seguro aplicado", {
      empresaId: input.empresaId,
      erro: error instanceof Error ? error.message : "erro desconhecido",
    })
    revisaoFalhou = true
    respostaCorrigida = tipoPedido === "criativo" ? respostaInicialLimpa : respostaSemDados()
  }
  const verificacoesFinais = verificarDeterministicamente(respostaCorrigida, baseFactual)
  let avaliacaoFinal: AvaliacaoResposta | null = null
  try {
    avaliacaoFinal = await avaliar(input.pergunta, contextoAvaliacao, respostaCorrigida, verificacoesFinais, tipoPedido)
  } catch {}
  const passou = !revisaoFalhou && avaliacaoFinal ? aprovada(avaliacaoFinal, verificacoesFinais, tipoPedido) : false
  const revisaoCriativaSegura = tipoPedido === "criativo" && respostaCriativaSegura(respostaCorrigida)
  const inicialCriativaSegura = tipoPedido === "criativo" && respostaCriativaSegura(respostaInicialLimpa)
  const podePreservarCriativa = revisaoCriativaSegura || inicialCriativaSegura
  const respostaFinal = passou
    ? respostaCorrigida
    : revisaoCriativaSegura
      ? respostaCorrigida
      : inicialCriativaSegura
        ? respostaInicialLimpa
        : respostaSemDados()
  const resultado: ResultadoResposta = {
    respostaInicial: input.respostaInicial,
    respostaFinal,
    avaliacaoInicial,
    avaliacaoFinal,
    verificacoes: verificacoesFinais,
    correcaoAplicada: true,
    respostaConservadora: !passou && !podePreservarCriativa,
  }
  await salvarAuditoria({ empresaId: input.empresaId, pergunta: input.pergunta, resultado }).catch((error) => {
    console.warn("[avaliacao-ia] auditoria não persistida", {
      empresaId: input.empresaId,
      erro: error instanceof Error ? error.message : "erro desconhecido",
    })
  })
  return resultado
}
