"use server"

import { revalidatePath } from "next/cache"
import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"
import { criarReuniao, excluirReuniao } from "@/lib/reunioes-db"

// Modelo da OpenAI. Troque aqui se sua conta usar outro (ex.: "gpt-4o-mini").
const MODELO = "gpt-4o"

const schemaReuniao = z.object({
  titulo: z
    .string()
    .describe("Título curto da reunião. Ex.: 'Alinhamento mensal', 'Reunião de kickoff'. Se não houver, crie um adequado."),
  resumo: z.string().describe("Resumo da reunião em 2 a 4 frases, fiel ao que foi discutido."),
  decisoes: z.array(z.string()).describe("Decisões tomadas na reunião."),
  problemas: z.array(z.string()).describe("Problemas, dores ou pontos de atenção levantados."),
  proximasAcoes: z.array(z.string()).describe("Próximas ações / tarefas combinadas, com responsável quando citado."),
  insights: z.array(z.string()).describe("Insights estratégicos relevantes para a memória de longo prazo do cliente."),
})

export type EstadoReuniao = { ok: boolean; erro?: string }

export async function salvarReuniaoAction(_prev: EstadoReuniao, formData: FormData): Promise<EstadoReuniao> {
  const empresaId = String(formData.get("empresaId") ?? "").trim()
  const data = String(formData.get("data") ?? "").trim()
  const notas = String(formData.get("notas") ?? "").trim()

  if (!empresaId) return { ok: false, erro: "Cliente não identificado." }
  if (notas.length < 10) {
    return { ok: false, erro: "Escreva um pouco mais sobre a reunião para a IA organizar (mín. 10 caracteres)." }
  }

  let estruturado: z.infer<typeof schemaReuniao>
  try {
    const { experimental_output } = await generateText({
      model: openai(MODELO),
      experimental_output: Output.object({ schema: schemaReuniao }),
      system: PERSONA,
      prompt:
        `Organize as anotações de uma reunião com um cliente da SIMPLE. ` +
        `Extraia um título, um resumo, as decisões, os problemas levantados, as próximas ações e os insights estratégicos. ` +
        `Seja fiel ao texto, não invente informações.\n\n` +
        (data ? `Data da reunião: ${data}\n\n` : "") +
        `Anotações:\n${notas}`,
    })
    estruturado = experimental_output
  } catch (e) {
    console.error("[v0] Erro ao estruturar reunião:", e)
    const msg = e instanceof Error ? e.message : "Falha ao processar com a IA."
    return {
      ok: false,
      erro:
        msg.includes("model") || msg.includes("does not exist") || msg.includes("access")
          ? `O modelo "${MODELO}" não está disponível na sua conta OpenAI. Ajuste a constante MODELO em app/(crm)/clientes/reunioes-actions.ts.`
          : `Não foi possível organizar a reunião agora. Detalhe: ${msg}`,
    }
  }

  try {
    await criarReuniao({
      empresaId,
      titulo: estruturado.titulo || "Reunião",
      data: data || null,
      resumo: estruturado.resumo ?? "",
      decisoes: estruturado.decisoes ?? [],
      problemas: estruturado.problemas ?? [],
      proximasAcoes: estruturado.proximasAcoes ?? [],
      insights: estruturado.insights ?? [],
      notasOriginais: notas,
    })
  } catch (e) {
    console.error("[v0] Erro ao salvar reunião:", e)
    return {
      ok: false,
      erro: "Não foi possível salvar. Verifique se a tabela cliente_reuniao existe no banco (rode o SQL informado).",
    }
  }

  revalidatePath(`/clientes/${empresaId}`)
  return { ok: true }
}

export async function excluirReuniaoAction(_prev: EstadoReuniao, formData: FormData): Promise<EstadoReuniao> {
  const id = String(formData.get("id") ?? "").trim()
  const empresaId = String(formData.get("empresaId") ?? "").trim()
  if (!id || !empresaId) return { ok: false, erro: "Reunião inválida." }
  try {
    await excluirReuniao(id, empresaId)
  } catch (e) {
    console.error("[v0] Erro ao excluir reunião:", e)
    return { ok: false, erro: "Não foi possível excluir a reunião." }
  }
  revalidatePath(`/clientes/${empresaId}`)
  return { ok: true }
}
