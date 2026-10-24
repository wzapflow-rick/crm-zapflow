"use server"


import { exigirUsuario } from "@/lib/auth"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { PERSONA } from "@/lib/persona"
import { PLAYBOOK_ROTEIRO, ESTRUTURAS_ROTEIRO } from "@/lib/playbook-conteudo"
import { montarTextoRoteiro, type RoteiroGerado } from "@/lib/roteiro-texto"
import { montarContextoCliente } from "@/lib/contexto-cliente"
import { limparFormatacaoChat } from "@/lib/texto-chat"
import { criarConteudos } from "@/lib/clientes-db"
import { agendarAtualizacaoInteligencia } from "@/lib/atualizacao-inteligencia"

const MODELO = "gpt-5"

export type { RoteiroGerado } from "@/lib/roteiro-texto"

export type EstadoRoteiroIa =
  | { ok: true; roteiro: RoteiroGerado }
  | { ok: false; erro: string }

const schema = z.object({
  estrutura: z
    .enum(ESTRUTURAS_ROTEIRO)
    .describe("Estrutura narrativa escolhida para este conteúdo, conforme o playbook."),
  gancho: z
    .string()
    .describe("Gancho falado (ou capa, no carrossel) dos primeiros 3 segundos. Específico do cliente, nunca genérico."),
  ganchoVisual: z
    .string()
    .describe("O que aparece na tela no primeiro segundo para parar a rolagem. Vazio se não se aplicar."),
  textoTelaGancho: z
    .string()
    .describe("Texto na tela que acompanha o gancho: no máximo 2 linhas curtas. Vazio se não se aplicar."),
  cenas: z
    .array(
      z.object({
        tempo: z
          .string()
          .describe("Marcação de tempo da cena no vídeo (ex.: '3-10s') ou 'Slide 2' no carrossel. Vazio em estático."),
        descricao: z.string().describe("O que acontece e o que é dito nesta cena, em 1 a 3 frases."),
        textoTela: z
          .string()
          .describe("Texto na tela desta cena: até 2 linhas de 3 a 5 palavras. Vazio se não houver."),
      }),
    )
    .min(3)
    .describe("Sequência de cenas (ou slides) na ordem de gravação, do gancho até o CTA."),
  cta: z.string().describe("Chamada para ação final, específica e ligada a uma meta de negócio do cliente."),
  legenda: z
    .string()
    .describe("Legenda pronta: primeira linha forte que funciona sozinha, corpo curto, CTA e até 5 hashtags específicas."),
  direcionamento: z
    .string()
    .describe(
      "Orientação interna de gravação e edição para videomaker e design: enquadramento, luz, áudio, ritmo de cortes, B-roll e referências. Nunca aparece para o cliente.",
    ),
  variacoesGancho: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("Variações do gancho para teste A/B, cada uma com uma fórmula diferente (curiosidade, história, valor, contraste)."),
})

// Atalho do chat estratégico: grava o roteiro estruturado como um novo conteúdo
// no pipeline do cliente (status "ideia"), pronto para editar depois.
export async function salvarRoteiroGeradoAction(input: {
  clienteId: string
  titulo: string
  formato: string
  roteiro: RoteiroGerado
}): Promise<{ ok: boolean; erro?: string }> {
  await exigirUsuario()
  const clienteId = input.clienteId.trim()
  const titulo = input.titulo.trim()
  if (!clienteId) return { ok: false, erro: "Cliente não identificado." }
  if (!titulo) return { ok: false, erro: "Informe um título para salvar o conteúdo." }
  try {
    await criarConteudos(clienteId, [
      {
        titulo,
        formato: input.formato || "Reels",
        status: "ideia",
        roteiro: montarTextoRoteiro(input.roteiro),
        legenda: input.roteiro.legenda,
        direcionamento: input.roteiro.direcionamento,
      },
    ])
  } catch (e) {
    console.log("[v0] Erro ao salvar roteiro gerado:", e instanceof Error ? e.message : e)
    return { ok: false, erro: "Não foi possível salvar no pipeline. Tente novamente." }
  }
  agendarAtualizacaoInteligencia(clienteId)
  revalidatePath("/marketing")
  revalidatePath(`/clientes/${clienteId}`)
  return { ok: true }
}

export async function gerarRoteiroConteudoAction(input: {
  clienteId: string
  titulo: string
  formato: string
  instrucao?: string
}): Promise<EstadoRoteiroIa> {
  await exigirUsuario()
  const clienteId = input.clienteId.trim()
  const titulo = input.titulo.trim()
  if (!clienteId) return { ok: false, erro: "Cliente não identificado." }
  if (!titulo) return { ok: false, erro: "Dê um título ao conteúdo antes de gerar o roteiro." }

  let contextoTexto = ""
  try {
    const contexto = await montarContextoCliente(clienteId, `${titulo} ${input.instrucao ?? ""}`)
    contextoTexto = contexto?.texto ?? ""
  } catch (e) {
    console.log("[v0] Falha ao montar contexto do roteiro:", e instanceof Error ? e.message : e)
  }

  try {
    const { object } = await generateObject({
      model: openai(MODELO),
      schema,
      system: `${PERSONA}

# TAREFA: CRIAR O ROTEIRO DE UM CONTEÚDO
Você vai escrever o roteiro completo de um único conteúdo do pipeline do cliente, no formato indicado.
Use o contexto do cliente abaixo como direção estratégica: segmento, objetivo, estratégia, memória, resultados e conteúdos anteriores.
Se o contexto mostrar ganchos, formatos ou temas que performaram melhor, prefira esses padrões e diga no direcionamento qual padrão foi reaproveitado.

Regras:
- Escolha a estrutura do playbook que melhor serve ao tema e ao formato.
- Reels: 15 a 30 segundos no total, com marcação de tempo por cena. Carrossel: cada cena é um slide. Story: sequência com interação. Estático: poucas cenas descrevendo a peça.
- As cenas devem ser gravláveis por uma equipe pequena, de preferência no próprio local do cliente.
- O CTA precisa apontar para uma meta de negócio, não apenas para curtidas.
- Use os poucos dados disponíveis quando o contexto for escasso; nunca invente métricas do cliente.
- Escreva tudo em português do Brasil, em texto simples, sem markdown.

${PLAYBOOK_ROTEIRO}

# CONTEXTO DO CLIENTE
${contextoTexto || "Sem contexto estruturado disponível. Use boas práticas para o formato e segmento informados."}`,
      prompt: `Formato: ${input.formato || "Reels"}
Título/tema do conteúdo: ${titulo}
${input.instrucao?.trim() ? `Instruções adicionais da equipe: ${input.instrucao.trim()}` : ""}`,
    })

    const limpar = (s: string) => limparFormatacaoChat(s).trim()

    return {
      ok: true,
      roteiro: {
        estrutura: object.estrutura,
        gancho: limpar(object.gancho),
        ganchoVisual: limpar(object.ganchoVisual),
        textoTelaGancho: limpar(object.textoTelaGancho),
        cenas: object.cenas
          .map((c) => ({ tempo: limpar(c.tempo), descricao: limpar(c.descricao), textoTela: limpar(c.textoTela) }))
          .filter((c) => c.descricao),
        cta: limpar(object.cta),
        legenda: limpar(object.legenda),
        direcionamento: limpar(object.direcionamento),
        variacoesGancho: object.variacoesGancho.map(limpar).filter(Boolean),
      },
    }
  } catch (e) {
    console.log("[v0] Erro ao gerar roteiro:", e instanceof Error ? e.message : e)
    const msg = e instanceof Error ? e.message : "Falha ao gerar o roteiro."
    return {
      ok: false,
      erro:
        msg.includes("model") || msg.includes("does not exist") || msg.includes("access")
          ? `O modelo "${MODELO}" não está disponível nesta conta.`
          : `Não foi possível gerar o roteiro agora. Detalhe: ${msg}`,
    }
  }
}
