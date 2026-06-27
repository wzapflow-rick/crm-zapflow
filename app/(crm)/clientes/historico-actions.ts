"use server"

import { revalidatePath } from "next/cache"
import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"
import { criarRegistroHistorico, excluirRegistroHistorico } from "@/lib/historico-db"

// Modelo da OpenAI. Troque aqui se sua conta usar outro (ex.: "gpt-4o-mini").
const MODELO = "gpt-4o"

const schemaRegistro = z.object({
  referencia: z
    .string()
    .describe("Período do registro, curto. Ex.: 'Mês 1', 'Janeiro 2026'. Se o texto não disser, use o período informado."),
  metricas: z
    .array(z.object({ rotulo: z.string(), valor: z.string() }))
    .describe("Números citados no texto (seguidores, views, alcance, faturamento, etc.) como rótulo + valor."),
  resolvidos: z.array(z.string()).describe("Problemas que foram resolvidos no período."),
  novosProblemas: z.array(z.string()).describe("Problemas atuais / novos a resolver."),
  proximosPassos: z.array(z.string()).describe("Próximos passos e prioridades recomendados pela SIMPLE OS."),
  analise: z
    .string()
    .describe("Análise estratégica do período em 2 a 4 frases: o que aconteceu, por quê e o que fazer."),
})

export type EstadoHistorico = { ok: boolean; erro?: string }

export async function salvarRegistroHistoricoAction(
  _prev: EstadoHistorico,
  formData: FormData,
): Promise<EstadoHistorico> {
  const empresaId = String(formData.get("empresaId") ?? "").trim()
  const periodo = String(formData.get("periodo") ?? "").trim()
  const notas = String(formData.get("notas") ?? "").trim()

  if (!empresaId) return { ok: false, erro: "Cliente não identificado." }
  if (notas.length < 10) {
    return { ok: false, erro: "Escreva um pouco mais sobre o período para a IA organizar (mín. 10 caracteres)." }
  }

  let estruturado: z.infer<typeof schemaRegistro>
  try {
    const { experimental_output } = await generateText({
      model: openai(MODELO),
      experimental_output: Output.object({ schema: schemaRegistro }),
      system: PERSONA,
      prompt:
        `Organize as anotações abaixo em um registro de evolução de um cliente da SIMPLE. ` +
        `Extraia métricas (números), o que foi resolvido, os problemas atuais e os próximos passos, ` +
        `e escreva uma análise estratégica curta. Seja fiel ao texto, não invente números.\n\n` +
        (periodo ? `Período informado: ${periodo}\n\n` : "") +
        `Anotações:\n${notas}`,
    })
    estruturado = experimental_output
  } catch (e) {
    console.error("[v0] Erro ao estruturar histórico:", e)
    const msg = e instanceof Error ? e.message : "Falha ao processar com a IA."
    return {
      ok: false,
      erro:
        msg.includes("model") || msg.includes("does not exist") || msg.includes("access")
          ? `O modelo "${MODELO}" não está disponível na sua conta OpenAI. Ajuste a constante MODELO em app/(crm)/clientes/historico-actions.ts.`
          : `Não foi possível organizar o registro agora. Detalhe: ${msg}`,
    }
  }

  try {
    await criarRegistroHistorico({
      empresaId,
      referencia: estruturado.referencia || periodo || "Sem período",
      metricas: estruturado.metricas ?? [],
      resolvidos: estruturado.resolvidos ?? [],
      novosProblemas: estruturado.novosProblemas ?? [],
      proximosPassos: estruturado.proximosPassos ?? [],
      analise: estruturado.analise ?? "",
      notasOriginais: notas,
    })
  } catch (e) {
    console.error("[v0] Erro ao salvar histórico:", e)
    return {
      ok: false,
      erro:
        "Não foi possível salvar. Verifique se a tabela cliente_historico existe no banco (rode o SQL informado).",
    }
  }

  revalidatePath(`/clientes/${empresaId}`)
  return { ok: true }
}

export async function excluirRegistroHistoricoAction(
  _prev: EstadoHistorico,
  formData: FormData,
): Promise<EstadoHistorico> {
  const id = String(formData.get("id") ?? "").trim()
  const empresaId = String(formData.get("empresaId") ?? "").trim()
  if (!id || !empresaId) return { ok: false, erro: "Registro inválido." }
  try {
    await excluirRegistroHistorico(id, empresaId)
  } catch (e) {
    console.error("[v0] Erro ao excluir histórico:", e)
    return { ok: false, erro: "Não foi possível excluir o registro." }
  }
  revalidatePath(`/clientes/${empresaId}`)
  return { ok: true }
}
