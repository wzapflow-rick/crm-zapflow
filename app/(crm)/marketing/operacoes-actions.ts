"use server"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { PERSONA } from "@/lib/persona"
import { criarOperacao, excluirOperacao } from "@/lib/operacoes-db"

const MODELO = "gpt-4o"

export type EstadoOperacao = { ok: boolean; erro?: string }

const schema = z.object({
  titulo: z.string().describe("Nome curto e claro da operação, ex.: 'Operação Gancho'"),
  objetivo: z.string().describe("O que a operação quer descobrir, em 1 a 2 frases"),
  status: z
    .enum(["planejamento", "em_andamento", "concluida"])
    .describe(
      "planejamento = ainda sendo planejada, sem dados; em_andamento = rodando/coletando; concluida = já tem resultados e veredito",
    ),
  metodologia: z.string().describe("Como o teste foi/está sendo feito. Ex.: mesmo conteúdo, só o gancho muda."),
  variacoes: z.array(z.string()).describe("As variações testadas. Ex.: Curiosidade, Promessa, Descoberta, Alerta, Contraste"),
  metricas: z.array(z.string()).describe("As métricas analisadas. Ex.: Visualizações, Retenção, Salvamentos"),
  vencedor: z
    .string()
    .describe(
      "Qual variação venceu e por quê, com números quando houver. Deixe vazio se a operação ainda não tem resultado.",
    ),
  aprendizados: z
    .array(z.string())
    .describe(
      "Aprendizados acionáveis extraídos dos dados. Se ainda não há resultado, deixe a lista vazia — nunca invente.",
    ),
  recomendacoes: z
    .array(z.string())
    .describe("Recomendações práticas para aplicar na criação de conteúdo dos clientes com base nesta operação."),
  resumo: z.string().describe("Síntese de 2 a 3 frases da operação e do que ela ensina para a SIMPLE."),
})

export async function criarOperacaoAction(
  _prev: EstadoOperacao,
  formData: FormData,
): Promise<EstadoOperacao> {
  const tituloManual = String(formData.get("titulo") ?? "").trim()
  const texto = String(formData.get("dados") ?? "").trim()

  if (texto.length < 20) {
    return { ok: false, erro: "Cole as informações da operação (o texto está muito curto)." }
  }

  try {
    const { object } = await generateObject({
      model: openai(MODELO),
      schema,
      system: `${PERSONA}

# TAREFA: ORGANIZAR UMA OPERAÇÃO DA SIMPLE
Uma "operação" é um teste real e controlado da agência (ex.: testar 5 tipos de gancho no mesmo conteúdo). A filosofia é: MENOS ACHISMO, MAIS DADOS. HIPÓTESE → TESTE → DADOS → APRENDIZADO.

Você vai receber um texto bruto (colado pela equipe) descrevendo uma operação — pode ser só o planejamento, ou já com dados coletados. Organize esse texto em campos estruturados.

Regras rígidas:
- NUNCA invente resultados. Se o texto só descreve o plano (sem dados coletados), marque status = "planejamento" e deixe "vencedor" e "aprendizados" vazios.
- Só preencha "vencedor" e "aprendizados" quando o texto trouxer dados/resultados reais.
- "recomendacoes" devem ser acionáveis para a criação de conteúdo dos clientes.
- Seja fiel ao texto; não adicione métricas ou variações que não estejam nele.
- Escreva em português do Brasil.`,
      prompt: `${tituloManual ? `Título sugerido pela equipe: ${tituloManual}\n\n` : ""}Texto bruto da operação:\n\n${texto}`,
    })

    await criarOperacao({
      titulo: object.titulo || tituloManual || "Operação sem título",
      objetivo: object.objetivo,
      status: object.status,
      metodologia: object.metodologia,
      vencedor: object.vencedor,
      resumo: object.resumo,
      dadosBrutos: texto,
      variacoes: object.variacoes,
      metricas: object.metricas,
      aprendizados: object.aprendizados,
      recomendacoes: object.recomendacoes,
    })

    revalidatePath("/marketing")
    return { ok: true }
  } catch (e) {
    console.log("[v0] Erro ao organizar operação:", e instanceof Error ? e.message : e)
    const msg = e instanceof Error ? e.message : "Falha ao organizar a operação."
    return {
      ok: false,
      erro:
        msg.includes("model") || msg.includes("does not exist") || msg.includes("access")
          ? `O modelo "${MODELO}" não está disponível na sua conta OpenAI.`
          : `Não foi possível organizar a operação agora. Detalhe: ${msg}`,
    }
  }
}

export async function excluirOperacaoAction(id: string): Promise<EstadoOperacao> {
  try {
    await excluirOperacao(id)
    revalidatePath("/marketing")
    return { ok: true }
  } catch (e) {
    console.log("[v0] Erro ao excluir operação:", e instanceof Error ? e.message : e)
    return { ok: false, erro: "Não foi possível excluir a operação." }
  }
}
