"use server"

import { revalidatePath } from "next/cache"
import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"
import { criarRegistroHistorico, excluirRegistroHistorico } from "@/lib/historico-db"
import { montarContextoCliente } from "@/lib/contexto-cliente"

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

// Gera um registro de evolução AUTOMATICAMENTE, sem digitação: puxa TODO o
// contexto do cliente (Instagram real, performance dos posts, estratégia,
// resultados, conteúdos, experimentos, padrões, reuniões, memória, operações e
// análises versionadas) via montarContextoCliente e pede à IA uma análise
// estratégica estruturada do período.
export async function gerarEvolucaoAutomaticaAction(
  _prev: EstadoHistorico,
  formData: FormData,
): Promise<EstadoHistorico> {
  const empresaId = String(formData.get("empresaId") ?? "").trim()
  if (!empresaId) return { ok: false, erro: "Cliente não identificado." }

  let contexto: Awaited<ReturnType<typeof montarContextoCliente>>
  try {
    contexto = await montarContextoCliente(empresaId)
  } catch (e) {
    console.error("[v0] Erro ao montar contexto para evolução:", e)
    return { ok: false, erro: "Não foi possível reunir os dados do cliente para a análise." }
  }
  if (!contexto) return { ok: false, erro: "Cliente não encontrado." }

  // Sem dados suficientes não há o que analisar de verdade.
  const totalSinais = contexto.resumo.blocos.reduce((soma, b) => soma + b.itens, 0)
  if (totalSinais === 0) {
    return {
      ok: false,
      erro:
        "Ainda não há dados suficientes deste cliente (Instagram, conteúdos, resultados, etc.) para gerar uma análise automática.",
    }
  }

  const agora = new Date()
  const periodoPadrao = agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  let estruturado: z.infer<typeof schemaRegistro>
  try {
    const { experimental_output } = await generateText({
      model: openai(MODELO),
      experimental_output: Output.object({ schema: schemaRegistro }),
      system: PERSONA,
      prompt:
        `Você é o estrategista da SIMPLE. Gere um registro de EVOLUÇÃO deste cliente analisando ` +
        `TODOS os dados reais disponíveis abaixo: desempenho do Instagram, performance de cada post, ` +
        `estratégia, metas/KPIs, resultados, conteúdos publicados, experimentos, padrões aprendidos, ` +
        `reuniões, operações e análises anteriores.\n\n` +
        `Regras:\n` +
        `- Use SOMENTE números presentes nos dados; nunca invente métricas.\n` +
        `- Em "metricas", traga os indicadores mais relevantes do período (ex.: seguidores, alcance, ` +
        `views, engajamento, melhores formatos) como rótulo + valor.\n` +
        `- Em "resolvidos", o que evoluiu/melhorou comparado ao passado (use as análises anteriores e o histórico).\n` +
        `- Em "novosProblemas", gargalos e pontos fracos atuais evidenciados pelos dados.\n` +
        `- Em "proximosPassos", recomendações concretas e acionáveis baseadas no que os dados mostram que funciona.\n` +
        `- Em "analise", escreva de 3 a 5 frases conectando o que aconteceu, por que, e o caminho.\n` +
        `- Para "referencia", use "${periodoPadrao}" a menos que os dados indiquem um período mais preciso.\n\n` +
        `=== DADOS COMPLETOS DO CLIENTE ===\n${contexto.texto}`,
    })
    estruturado = experimental_output
  } catch (e) {
    console.error("[v0] Erro ao gerar evolução automática:", e)
    const msg = e instanceof Error ? e.message : "Falha ao processar com a IA."
    return {
      ok: false,
      erro:
        msg.includes("model") || msg.includes("does not exist") || msg.includes("access")
          ? `O modelo "${MODELO}" não está disponível na sua conta OpenAI. Ajuste a constante MODELO em app/(crm)/clientes/historico-actions.ts.`
          : `Não foi possível gerar a análise agora. Detalhe: ${msg}`,
    }
  }

  try {
    await criarRegistroHistorico({
      empresaId,
      referencia: estruturado.referencia || periodoPadrao,
      metricas: estruturado.metricas ?? [],
      resolvidos: estruturado.resolvidos ?? [],
      novosProblemas: estruturado.novosProblemas ?? [],
      proximosPassos: estruturado.proximosPassos ?? [],
      analise: estruturado.analise ?? "",
      notasOriginais: `Análise gerada automaticamente pela IA em ${agora.toLocaleString("pt-BR")} a partir de todos os dados do cliente.`,
    })
  } catch (e) {
    console.error("[v0] Erro ao salvar evolução automática:", e)
    return {
      ok: false,
      erro: "Não foi possível salvar a análise. Verifique se a tabela cliente_historico existe no banco.",
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
