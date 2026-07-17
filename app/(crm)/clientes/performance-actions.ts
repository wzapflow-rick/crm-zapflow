"use server"

import { revalidatePath } from "next/cache"
import { generateText, Output } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"
import { inserirPerformance, excluirPerformance } from "@/lib/performance-db"

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

function paraNumero(valor: FormDataEntryValue | null): number | null {
  const s = String(valor ?? "").replace(/\./g, "").replace(",", ".").trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export type EstadoPerformance = { ok: boolean; erro?: string }

export async function salvarPerformanceAction(
  _prev: EstadoPerformance,
  formData: FormData,
): Promise<EstadoPerformance> {
  const empresaId = String(formData.get("empresaId") ?? "").trim()
  const titulo = String(formData.get("titulo") ?? "").trim()
  const formato = String(formData.get("formato") ?? "Reels").trim()
  const data = String(formData.get("data") ?? "").trim()
  const gancho = String(formData.get("gancho") ?? "").trim()
  const objetivo = String(formData.get("objetivo") ?? "").trim()
  const roteiro = String(formData.get("roteiro") ?? "").trim()
  const publico = String(formData.get("publico") ?? "").trim()

  const views = paraNumero(formData.get("views"))
  const curtidas = paraNumero(formData.get("curtidas"))
  const comentarios = paraNumero(formData.get("comentarios"))
  const salvamentos = paraNumero(formData.get("salvamentos"))
  const compartilhamentos = paraNumero(formData.get("compartilhamentos"))
  const alcance = paraNumero(formData.get("alcance"))
  const visitasPerfil = paraNumero(formData.get("visitasPerfil"))
  const seguidores = paraNumero(formData.get("seguidores"))
  const reposts = paraNumero(formData.get("reposts"))

  if (!empresaId) return { ok: false, erro: "Cliente não identificado." }
  if (!titulo) return { ok: false, erro: "Dê um título ou descrição ao conteúdo." }

  // A IA gera os aprendizados com base nos dados informados.
  let aprendizados: string[] = []
  try {
    const metricasTxt = [
      views != null ? `Views: ${views}` : "",
      alcance != null ? `Alcance: ${alcance}` : "",
      curtidas != null ? `Curtidas: ${curtidas}` : "",
      comentarios != null ? `Comentários: ${comentarios}` : "",
      salvamentos != null ? `Salvamentos: ${salvamentos}` : "",
      compartilhamentos != null ? `Compartilhamentos: ${compartilhamentos}` : "",
      reposts != null ? `Reposts: ${reposts}` : "",
      visitasPerfil != null ? `Visitas ao perfil: ${visitasPerfil}` : "",
      seguidores != null ? `Novos seguidores: ${seguidores}` : "",
    ]
      .filter(Boolean)
      .join(" | ")

    const { experimental_output } = await generateText({
      model: openai(MODELO),
      experimental_output: Output.object({ schema: schemaAprendizados }),
      system: PERSONA,
      prompt:
        `Analise a performance de um conteúdo publicado no Instagram de um cliente da SIMPLE e gere aprendizados estratégicos.\n\n` +
        `Conteúdo: ${titulo}\n` +
        `Formato: ${formato}\n` +
        (gancho ? `Gancho: ${gancho}\n` : "") +
        (objetivo ? `Objetivo: ${objetivo}\n` : "") +
        (roteiro ? `Roteiro do conteúdo: ${roteiro}\n` : "") +
        (publico ? `Detalhe do público alcançado: ${publico}\n` : "") +
        (metricasTxt ? `Métricas: ${metricasTxt}\n` : "Sem métricas informadas.\n") +
        `\nConsidere especialmente a relação entre visitas ao perfil, novos seguidores e reposts para avaliar ` +
        `conversão e crescimento, não só engajamento. Gere de 2 a 4 aprendizados acionáveis. ` +
        `Se faltarem métricas, foque no roteiro, gancho, formato e objetivo.`,
    })
    aprendizados = experimental_output.aprendizados ?? []
  } catch (e) {
    console.error("[v0] Erro ao gerar aprendizados:", e)
    // Não bloqueia o salvamento: o conteúdo é salvo mesmo sem os aprendizados da IA.
    aprendizados = []
  }

  try {
    await inserirPerformance(empresaId, {
      titulo,
      formato,
      data,
      gancho,
      objetivo,
      roteiro,
      publico,
      views,
      curtidas,
      comentarios,
      salvamentos,
      compartilhamentos,
      alcance,
      visitasPerfil,
      seguidores,
      reposts,
      aprendizados,
    })
  } catch (e) {
    console.error("[v0] Erro ao salvar performance:", e)
    return {
      ok: false,
      erro: "Não foi possível salvar. Verifique se a tabela cliente_conteudo_performance existe no banco (rode o SQL informado).",
    }
  }

  revalidatePath(`/clientes/${empresaId}`)
  return { ok: true }
}

export async function excluirPerformanceAction(
  _prev: EstadoPerformance,
  formData: FormData,
): Promise<EstadoPerformance> {
  const id = String(formData.get("id") ?? "").trim()
  const empresaId = String(formData.get("empresaId") ?? "").trim()
  if (!id || !empresaId) return { ok: false, erro: "Conteúdo inválido." }
  try {
    await excluirPerformance(id, empresaId)
  } catch (e) {
    console.error("[v0] Erro ao excluir performance:", e)
    return { ok: false, erro: "Não foi possível excluir o conteúdo." }
  }
  revalidatePath(`/clientes/${empresaId}`)
  return { ok: true }
}
