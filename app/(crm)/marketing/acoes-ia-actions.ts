"use server"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { PERSONA } from "@/lib/persona"
import { criarConteudos, adicionarEventos, adicionarItensEstrategia } from "@/lib/clientes-db"
import { criarTarefa } from "@/lib/tarefas-db"
import { criarExperimento } from "@/lib/experimentos-db"

const MODELO = "gpt-4o"

export type TipoAcaoIA = "conteudos" | "calendario" | "tarefas" | "estrategia" | "experimento"

const schemaConteudos = z.object({
  conteudos: z
    .array(
      z.object({
        titulo: z.string().describe("Título curto e claro do conteúdo"),
        formato: z.enum(["Reels", "Carrossel", "Story", "Vídeo", "Estático"]),
        roteiro: z.string().describe("Roteiro com gancho, desenvolvimento e CTA. Vazio se a resposta não trouxer."),
        legenda: z.string().describe("Sugestão de legenda para a publicação. Vazia se não houver."),
        direcionamento: z.string().describe("Direcionamento interno de gravação/edição. Vazio se não houver."),
      }),
    )
    .describe("Todos os conteúdos, ideias ou roteiros presentes na resposta"),
})

const schemaCalendario = z.object({
  eventos: z
    .array(
      z.object({
        titulo: z.string().describe("Nome do compromisso"),
        tipo: z.enum(["gravacao", "post", "entrega", "reuniao"]),
        data: z.string().describe("Data no formato YYYY-MM-DD quando a resposta indicar; vazio se não houver."),
        hora: z.string().describe("Hora HH:MM quando indicada; vazia caso contrário."),
      }),
    )
    .describe("Compromissos/agendamentos citados na resposta"),
})

const schemaTarefas = z.object({
  tarefas: z
    .array(
      z.object({
        titulo: z.string().describe("Ação concreta a executar"),
        descricao: z.string().describe("Detalhe do que fazer. Vazio se não houver."),
        prioridade: z.enum(["alta", "media", "baixa"]),
      }),
    )
    .describe("Tarefas acionáveis extraídas da resposta"),
})

const schemaEstrategia = z.object({
  estrategiaAtual: z.array(z.string()).describe("Direções estratégicas acionáveis"),
  insights: z.array(z.string()).describe("Aprendizados/insights relevantes citados na resposta"),
})

const schemaExperimento = z.object({
  hipotese: z.string().describe("O que se acredita que vai acontecer"),
  oQueFoiTestado: z.string().describe("O que será/foi testado na prática"),
  resultado: z.string().describe("Resultado observado. Vazio se ainda não há dados."),
  conclusao: z.string().describe("Conclusão/aprendizado. Vazio se ainda não há dados."),
  status: z.enum(["em_teste", "repetir", "melhorar", "descartar"]),
})

const CONFIG: Record<
  TipoAcaoIA,
  { schema: z.ZodTypeAny; instrucao: string; vazio: (dados: any) => boolean }
> = {
  conteudos: {
    schema: schemaConteudos,
    instrucao:
      "Extraia da resposta todos os conteúdos, ideias de post ou roteiros e organize-os no pipeline. Preserve ganchos, falas e CTA no roteiro. Não invente dados que não estejam na resposta.",
    vazio: (d) => !d.conteudos?.length,
  },
  calendario: {
    schema: schemaCalendario,
    instrucao:
      "Extraia da resposta os compromissos, gravações, postagens ou entregas que possam virar eventos de calendário. Só preencha data/hora se a resposta indicar; caso contrário deixe vazio.",
    vazio: (d) => !d.eventos?.length,
  },
  tarefas: {
    schema: schemaTarefas,
    instrucao:
      "Extraia da resposta as ações concretas que a equipe precisa executar e transforme-as em tarefas objetivas, no infinitivo.",
    vazio: (d) => !d.tarefas?.length,
  },
  estrategia: {
    schema: schemaEstrategia,
    instrucao:
      "Extraia da resposta as direções estratégicas e os insights que valem a pena registrar na estratégia do cliente. Seja fiel ao texto.",
    vazio: (d) => !d.estrategiaAtual?.length && !d.insights?.length,
  },
  experimento: {
    schema: schemaExperimento,
    instrucao:
      "Transforme a ideia/recomendação da resposta em um experimento no formato hipótese → teste → resultado → conclusão. Se ainda não há dados, deixe resultado e conclusão vazios e use status 'em_teste'.",
    vazio: (d) => !d.hipotese?.trim(),
  },
}

export type EstadoExtracao = { ok: boolean; dados?: unknown; erro?: string }

// Passo 1: transforma a resposta da IA em uma estrutura pronta para revisão,
// sem gravar nada. O usuário confirma antes de persistir.
export async function extrairAcaoIA(
  tipo: TipoAcaoIA,
  textoResposta: string,
): Promise<EstadoExtracao> {
  const texto = textoResposta?.trim()
  if (!texto || texto.length < 10) {
    return { ok: false, erro: "A resposta é muito curta para gerar esta ação." }
  }
  const config = CONFIG[tipo]
  try {
    const { object } = await generateObject({
      model: openai(MODELO),
      schema: config.schema,
      system: `${PERSONA}

# TAREFA: ESTRUTURAR UMA RESPOSTA EM AÇÃO
Você recebe uma resposta estratégica já escrita pela SIMPLE OS e precisa organizá-la em campos estruturados.
${config.instrucao}
Regras: seja fiel ao texto, não invente números nem informações do cliente, e escreva em português do Brasil.`,
      prompt: `Resposta a estruturar:\n\n${texto}`,
    })
    if (config.vazio(object)) {
      return { ok: false, erro: "Não encontrei itens aplicáveis nesta resposta para esta ação." }
    }
    return { ok: true, dados: object }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido"
    console.log("[v0] Erro ao extrair ação da IA:", msg)
    return {
      ok: false,
      erro:
        /model|does not exist|access/.test(msg)
          ? `O modelo "${MODELO}" não está disponível nesta conta.`
          : "Não foi possível preparar esta ação agora. Tente novamente.",
    }
  }
}

export type EstadoAplicacao = { ok: boolean; mensagem?: string; erro?: string }

// Passo 2: grava a estrutura revisada no módulo correspondente.
export async function aplicarAcaoIA(
  tipo: TipoAcaoIA,
  empresaId: string,
  dados: unknown,
): Promise<EstadoAplicacao> {
  if (!empresaId) return { ok: false, erro: "Cliente não informado." }
  try {
    switch (tipo) {
      case "conteudos": {
        const { conteudos } = schemaConteudos.parse(dados)
        const n = await criarConteudos(
          empresaId,
          conteudos.map((c) => ({ ...c, status: "ideia" })),
        )
        return { ok: true, mensagem: `${n} conteúdo(s) adicionado(s) ao pipeline.` }
      }
      case "calendario": {
        const { eventos } = schemaCalendario.parse(dados)
        const n = await adicionarEventos(empresaId, eventos)
        return { ok: true, mensagem: `${n} compromisso(s) adicionado(s) ao calendário.` }
      }
      case "tarefas": {
        const { tarefas } = schemaTarefas.parse(dados)
        let n = 0
        for (const t of tarefas) {
          await criarTarefa({
            titulo: t.titulo,
            descricao: t.descricao,
            clienteId: empresaId,
            prioridade: t.prioridade,
            status: "pendente",
          })
          n++
        }
        return { ok: true, mensagem: `${n} tarefa(s) criada(s).` }
      }
      case "estrategia": {
        const parsed = schemaEstrategia.parse(dados)
        const n = await adicionarItensEstrategia(empresaId, parsed)
        return { ok: true, mensagem: `${n} item(ns) salvos na estratégia do cliente.` }
      }
      case "experimento": {
        const exp = schemaExperimento.parse(dados)
        await criarExperimento(empresaId, exp)
        return { ok: true, mensagem: "Experimento registrado." }
      }
      default:
        return { ok: false, erro: "Ação desconhecida." }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido"
    console.log("[v0] Erro ao aplicar ação da IA:", msg)
    return { ok: false, erro: "Não foi possível salvar. Tente novamente." }
  } finally {
    revalidatePath("/marketing")
  }
}
