"use server"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { agregarBaseAnonima, substituirAprendizadosGlobais } from "@/lib/global-db"

export type EstadoGlobal = { ok: boolean; erro?: string; quantidade?: number }

const schema = z.object({
  aprendizados: z
    .array(
      z.object({
        categoria: z
          .string()
          .describe("Categoria do aprendizado, ex.: Formato, Gancho, Frequência, Tema, Conversão"),
        aprendizado: z.string().describe("O aprendizado geral, acionável e específico"),
        baseAmostral: z.string().describe("Em quantos clientes/conteúdos isso se baseia, ex.: '8 clientes, 40 Reels'"),
        confianca: z.enum(["alta", "media", "baixa"]),
      }),
    )
    .describe("Aprendizados que valem para a agência como um todo"),
})

function resumoAgregado(base: Awaited<ReturnType<typeof agregarBaseAnonima>>): string {
  const partes: string[] = []
  partes.push(`Base: ${base.totalClientes} clientes na carteira.`)

  if (base.performancePorFormato.length) {
    partes.push(
      `\n## DESEMPENHO MÉDIO POR FORMATO\n${base.performancePorFormato
        .map(
          (f) =>
            `- ${f.formato}: ${f.amostras} conteúdos | média de ${f.mediaViews ?? "?"} views, ${
              f.mediaSalvamentos ?? "?"
            } salvamentos, ${f.mediaComentarios ?? "?"} comentários`,
        )
        .join("\n")}`,
    )
  }

  if (base.padroesPorCategoria.length) {
    partes.push(
      `\n## PADRÕES JÁ IDENTIFICADOS (por categoria, agregados)\n${base.padroesPorCategoria
        .map((p) => `- ${p.categoria} (${p.quantidade}): ${p.exemplos.join(" | ")}`)
        .join("\n")}`,
    )
  }

  if (base.experimentosPorStatus.length) {
    partes.push(
      `\n## EXPERIMENTOS POR VEREDITO\n${base.experimentosPorStatus
        .map((e) => `- ${e.status} (${e.quantidade}): ${e.exemplos.join(" | ")}`)
        .join("\n")}`,
    )
  }

  return partes.join("\n")
}

export async function analisarInteligenciaGlobalAction(): Promise<EstadoGlobal> {
  try {
    const base = await agregarBaseAnonima()

    const semDados =
      base.padroesPorCategoria.length === 0 &&
      base.performancePorFormato.length === 0 &&
      base.experimentosPorStatus.length === 0

    if (semDados) {
      return {
        ok: false,
        erro: "Ainda não há dados suficientes na base. Registre performance, experimentos e padrões em alguns clientes primeiro.",
      }
    }

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema,
      system: `Você é o cérebro de inteligência da agência SIMPLE OS. Recebe dados AGREGADOS e ANÔNIMOS de toda a carteira de clientes (nunca dados identificáveis de um cliente específico).

Sua missão: descobrir aprendizados GERAIS que valem para a agência inteira — padrões que se repetem entre vários clientes, não particularidades de um só. Pense como "Reels curtos retêm mais", "ganchos com pergunta geram mais comentários", "carrossel converte melhor que estático para autoridade".

Regras:
- Só afirme algo quando houver base que justifique; ajuste a confiança conforme a amostra.
- Seja específico e acionável; evite obviedades.
- Nunca cite nome de cliente (os dados já vêm anônimos).
- Escreva em português do Brasil.`,
      prompt: `Analise a base agregada abaixo e gere os aprendizados globais da agência:\n\n${resumoAgregado(base)}`,
    })

    await substituirAprendizadosGlobais(object.aprendizados)
    revalidatePath("/marketing")
    return { ok: true, quantidade: object.aprendizados.length }
  } catch (e) {
    console.log("[v0] Erro ao analisar inteligência global:", e instanceof Error ? e.message : e)
    return { ok: false, erro: "Não foi possível gerar a análise agora. Tente novamente." }
  }
}
