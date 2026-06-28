"use server"

import { revalidatePath } from "next/cache"
import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"
import { montarContextoCliente } from "@/lib/contexto-cliente"
import { substituirPadroes } from "@/lib/padroes-db"

const MODELO = "gpt-4o"

export type EstadoPadroes = { ok: boolean; erro?: string; quantidade?: number }

const schema = z.object({
  padroes: z
    .array(
      z.object({
        categoria: z
          .string()
          .describe("Categoria do padrão. Ex: Formato, Tema, Tom de voz, Audiência, Timing, Gancho, Objeção."),
        padrao: z
          .string()
          .describe("O padrão descoberto, afirmativo e acionável. Ex: 'Vídeos de bastidores retêm mais que tutoriais.'"),
        evidencia: z
          .string()
          .describe("A evidência concreta nos dados que sustenta o padrão (métricas, experimentos, reuniões)."),
        confianca: z
          .enum(["alta", "media", "baixa"])
          .describe("Confiança no padrão conforme a quantidade e consistência das evidências."),
      }),
    )
    .describe("Lista de padrões aprendidos sobre ESTE cliente. Apenas o que os dados sustentam — não invente."),
})

export async function analisarPadroesAction(
  _prev: EstadoPadroes,
  formData: FormData,
): Promise<EstadoPadroes> {
  const empresaId = String(formData.get("clienteId") ?? "")
  if (!empresaId) return { ok: false, erro: "Cliente não identificado." }

  const contexto = await montarContextoCliente(empresaId)
  if (!contexto) return { ok: false, erro: "Cliente não encontrado." }

  try {
    const { experimental_output } = await generateText({
      model: openai(MODELO),
      system: PERSONA,
      experimental_output: Output.object({ schema }),
      prompt: `Você é o motor de inteligência da SIMPLE OS. Analise TODA a base de conhecimento do cliente abaixo e descubra os PADRÕES reais que explicam o que funciona (e o que não funciona) para ele.

Regras:
- Relacione dados de reuniões, performance de conteúdo, experimentos, evolução e memória.
- Cada padrão deve ser sustentado por evidência concreta nos dados. NÃO invente padrões sem base.
- Prefira padrões acionáveis (que orientam decisões futuras de conteúdo e estratégia).
- Se houver poucos dados, retorne poucos padrões (ou nenhum). Qualidade acima de quantidade.

BASE DE CONHECIMENTO DO CLIENTE:
${contexto.texto}`,
    })

    await substituirPadroes(empresaId, experimental_output.padroes)
    revalidatePath(`/clientes/${empresaId}`)
    return { ok: true, quantidade: experimental_output.padroes.length }
  } catch (e) {
    console.log("[v0] Erro ao analisar padrões:", e instanceof Error ? e.message : e)
    return { ok: false, erro: "Não foi possível analisar com a IA. Tente novamente." }
  }
}
