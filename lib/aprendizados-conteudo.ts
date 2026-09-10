import "server-only"

import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"

// Modelo da OpenAI. Troque aqui se sua conta usar outro (ex.: "gpt-4o-mini").
const MODELO = "gpt-4o"

const schemaAprendizados = z.object({
  aprendizados: z
    .array(z.string())
    .describe(
      "2 a 4 aprendizados estratégicos e específicos sobre este conteúdo, com base nas métricas e no gancho/objetivo. " +
        "Diga o que funcionou, o que não funcionou e o que repetir ou evitar no futuro. Seja direto e acionável.",
    ),
})

export type DadosAprendizado = {
  titulo: string
  formato: string
  gancho?: string
  objetivo?: string
  roteiro?: string
  publico?: string
  views?: number | null
  curtidas?: number | null
  comentarios?: number | null
  salvamentos?: number | null
  compartilhamentos?: number | null
  alcance?: number | null
  visitasPerfil?: number | null
  seguidores?: number | null
  reposts?: number | null
}

// Gera os aprendizados estratégicos da IA para um conteúdo publicado.
// Nunca lança: em caso de erro devolve lista vazia (o salvamento não é bloqueado).
export async function gerarAprendizadosConteudo(dados: DadosAprendizado): Promise<string[]> {
  try {
    const metricasTxt = [
      dados.views != null ? `Views: ${dados.views}` : "",
      dados.alcance != null ? `Alcance: ${dados.alcance}` : "",
      dados.curtidas != null ? `Curtidas: ${dados.curtidas}` : "",
      dados.comentarios != null ? `Comentários: ${dados.comentarios}` : "",
      dados.salvamentos != null ? `Salvamentos: ${dados.salvamentos}` : "",
      dados.compartilhamentos != null ? `Compartilhamentos: ${dados.compartilhamentos}` : "",
      dados.reposts != null ? `Reposts: ${dados.reposts}` : "",
      dados.visitasPerfil != null ? `Visitas ao perfil: ${dados.visitasPerfil}` : "",
      dados.seguidores != null ? `Novos seguidores: ${dados.seguidores}` : "",
    ]
      .filter(Boolean)
      .join(" | ")

    const { experimental_output } = await generateText({
      model: openai(MODELO),
      experimental_output: Output.object({ schema: schemaAprendizados }),
      system: PERSONA,
      prompt:
        `Analise a performance de um conteúdo publicado no Instagram de um cliente da SIMPLE e gere aprendizados estratégicos.\n\n` +
        `Conteúdo: ${dados.titulo}\n` +
        `Formato: ${dados.formato}\n` +
        (dados.gancho ? `Gancho: ${dados.gancho}\n` : "") +
        (dados.objetivo ? `Objetivo: ${dados.objetivo}\n` : "") +
        (dados.roteiro ? `Roteiro do conteúdo: ${dados.roteiro}\n` : "") +
        (dados.publico ? `Detalhe do público alcançado: ${dados.publico}\n` : "") +
        (metricasTxt ? `Métricas reais do Instagram: ${metricasTxt}\n` : "Sem métricas informadas.\n") +
        `\nConsidere especialmente a relação entre alcance, salvamentos e compartilhamentos para avaliar ` +
        `ressonância e distribuição, não só engajamento. Gere de 2 a 4 aprendizados acionáveis. ` +
        `Se faltarem métricas, foque no roteiro, gancho, formato e objetivo.`,
    })
    return experimental_output.aprendizados ?? []
  } catch (e) {
    console.error("[v0] Erro ao gerar aprendizados:", e)
    return []
  }
}
