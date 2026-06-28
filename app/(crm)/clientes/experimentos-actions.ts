"use server"

import { revalidatePath } from "next/cache"
import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"
import {
  criarExperimento,
  excluirExperimento,
  type StatusExperimento,
} from "@/lib/experimentos-db"

const MODELO = "gpt-4o"

export type EstadoExperimento = { ok: boolean; erro?: string }

const schema = z.object({
  conclusao: z
    .string()
    .describe("Conclusão estratégica e objetiva do experimento, em 1-3 frases, em português do Brasil."),
  status: z
    .enum(["repetir", "melhorar", "descartar"])
    .describe(
      "Veredito: 'repetir' se funcionou e deve ser repetido, 'melhorar' se teve potencial mas precisa de ajustes, 'descartar' se não funcionou.",
    ),
})

export async function criarExperimentoAction(
  _prev: EstadoExperimento,
  formData: FormData,
): Promise<EstadoExperimento> {
  const empresaId = String(formData.get("clienteId") ?? "")
  const hipotese = String(formData.get("hipotese") ?? "").trim()
  const oQueFoiTestado = String(formData.get("oQueFoiTestado") ?? "").trim()
  const resultado = String(formData.get("resultado") ?? "").trim()

  if (!empresaId) return { ok: false, erro: "Cliente não identificado." }
  if (!hipotese) return { ok: false, erro: "Descreva a hipótese do experimento." }

  let conclusao = ""
  let status: StatusExperimento = "em_teste"

  // Se há resultado, a IA conclui e classifica. Sem resultado, fica "em teste".
  if (resultado) {
    try {
      const { experimental_output } = await generateText({
        model: openai(MODELO),
        system: PERSONA,
        experimental_output: Output.object({ schema }),
        prompt: `Analise este experimento de marketing e gere uma conclusão estratégica e um veredito.

HIPÓTESE: ${hipotese}
O QUE FOI TESTADO: ${oQueFoiTestado || "(não detalhado)"}
RESULTADO OBSERVADO: ${resultado}`,
      })
      conclusao = experimental_output.conclusao
      status = experimental_output.status
    } catch (e) {
      console.log("[v0] Erro ao analisar experimento:", e instanceof Error ? e.message : e)
      return { ok: false, erro: "Não foi possível analisar com a IA. Tente novamente." }
    }
  }

  try {
    await criarExperimento(empresaId, { hipotese, oQueFoiTestado, resultado, conclusao, status })
  } catch (e) {
    console.log("[v0] Erro ao salvar experimento:", e instanceof Error ? e.message : e)
    return { ok: false, erro: "Não foi possível salvar o experimento." }
  }

  revalidatePath(`/clientes/${empresaId}`)
  return { ok: true }
}

export async function excluirExperimentoAction(id: string, empresaId: string): Promise<void> {
  try {
    await excluirExperimento(id, empresaId)
    revalidatePath(`/clientes/${empresaId}`)
  } catch (e) {
    console.log("[v0] Erro ao excluir experimento:", e instanceof Error ? e.message : e)
  }
}
