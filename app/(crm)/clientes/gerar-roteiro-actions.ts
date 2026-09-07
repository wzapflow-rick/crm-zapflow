"use server"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"
import { montarContextoCliente } from "@/lib/contexto-cliente"
import { limparFormatacaoChat } from "@/lib/texto-chat"

const MODELO = "gpt-4o"

export type RoteiroGerado = {
  gancho: string
  cenas: { descricao: string }[]
  cta: string
  legenda: string
  direcionamento: string
  variacoesGancho: string[]
}

export type EstadoRoteiroIa =
  | { ok: true; roteiro: RoteiroGerado }
  | { ok: false; erro: string }

const schema = z.object({
  gancho: z
    .string()
    .describe("Gancho de abertura dos primeiros 3 segundos. Precisa impedir a pessoa de passar o vídeo."),
  cenas: z
    .array(
      z.object({
        descricao: z.string().describe("O que acontece e o que é dito nesta cena, em 1 a 3 frases."),
      }),
    )
    .min(3)
    .describe("Sequência de cenas do conteúdo, na ordem de gravação, conduzindo do gancho até o CTA."),
  cta: z.string().describe("Chamada para ação final, alinhada a uma meta de negócio do cliente."),
  legenda: z
    .string()
    .describe("Legenda pronta para publicação: primeira linha forte, corpo curto, CTA e hashtags relevantes."),
  direcionamento: z
    .string()
    .describe(
      "Orientação interna de gravação e edição para o videomaker e o design: enquadramentos, ritmo, textos na tela, referências visuais. Nunca aparece para o cliente.",
    ),
  variacoesGancho: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("Variações alternativas do gancho para testar (ângulos diferentes: curiosidade, promessa, contraste...)."),
})

export async function gerarRoteiroConteudoAction(input: {
  clienteId: string
  titulo: string
  formato: string
  instrucao?: string
}): Promise<EstadoRoteiroIa> {
  const clienteId = input.clienteId.trim()
  const titulo = input.titulo.trim()
  if (!clienteId) return { ok: false, erro: "Cliente não identificado." }
  if (!titulo) return { ok: false, erro: "Dê um título ao conteúdo antes de gerar o roteiro." }

  let contextoTexto = ""
  try {
    const contexto = await montarContextoCliente(clienteId, `${titulo} ${input.instrucao ?? ""}`)
    contextoTexto = contexto?.texto ?? ""
  } catch (e) {
    console.log("[v0] Falha ao montar contexto do roteiro:", e instanceof Error ? e.message : e)
  }

  try {
    const { object } = await generateObject({
      model: openai(MODELO),
      schema,
      system: `${PERSONA}

# TAREFA: CRIAR O ROTEIRO DE UM CONTEÚDO
Você vai escrever o roteiro completo de um único conteúdo do pipeline do cliente, no formato indicado.
Use o contexto do cliente abaixo como direção estratégica: segmento, objetivo, estratégia, memória, resultados e conteúdos anteriores.

Regras:
- O gancho precisa ser forte nos primeiros 3 segundos e coerente com o público do cliente.
- As cenas devem ser gravláveis por uma equipe pequena, sem sair do escritório quando possível.
- O CTA precisa apontar para uma meta de negócio, não apenas para curtidas.
- A legenda deve estar pronta para publicar.
- O direcionamento é interno (equipe), com orientações práticas de gravação e edição.
- Use os poucos dados disponíveis quando o contexto for escasso; nunca invente métricas do cliente.
- Escreva tudo em português do Brasil, em texto simples, sem markdown.

# CONTEXTO DO CLIENTE
${contextoTexto || "Sem contexto estruturado disponível. Use boas práticas para o formato e segmento informados."}`,
      prompt: `Formato: ${input.formato || "Reels"}
Título/tema do conteúdo: ${titulo}
${input.instrucao?.trim() ? `Instruções adicionais da equipe: ${input.instrucao.trim()}` : ""}`,
    })

    const limpar = (s: string) => limparFormatacaoChat(s).trim()

    return {
      ok: true,
      roteiro: {
        gancho: limpar(object.gancho),
        cenas: object.cenas.map((c) => ({ descricao: limpar(c.descricao) })).filter((c) => c.descricao),
        cta: limpar(object.cta),
        legenda: limpar(object.legenda),
        direcionamento: limpar(object.direcionamento),
        variacoesGancho: object.variacoesGancho.map(limpar).filter(Boolean),
      },
    }
  } catch (e) {
    console.log("[v0] Erro ao gerar roteiro:", e instanceof Error ? e.message : e)
    const msg = e instanceof Error ? e.message : "Falha ao gerar o roteiro."
    return {
      ok: false,
      erro:
        msg.includes("model") || msg.includes("does not exist") || msg.includes("access")
          ? `O modelo "${MODELO}" não está disponível nesta conta.`
          : `Não foi possível gerar o roteiro agora. Detalhe: ${msg}`,
    }
  }
}
