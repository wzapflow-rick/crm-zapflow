import "server-only"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { PERSONA } from "@/lib/persona"
import { montarContextoCliente } from "@/lib/contexto-cliente"
import { limparFormatacaoChat } from "@/lib/texto-chat"
import { getClientesAtencao, type AlertaCliente, type PrioridadeAlerta } from "@/lib/clientes-db"
import { getSugestoesVigentes, salvarSugestoesIa } from "@/lib/sugestoes-ia-db"

const MODELO = "gpt-4o"

// Quantos clientes o modelo processa por chamada (evita rajada de requisições).
const LOTE_CONCORRENCIA = 3
// Teto de gerações por carregamento, para não estourar custo em carteiras grandes.
const MAX_GERACOES = 12

// Abas válidas na página do cliente — restringe o link para nunca quebrar.
const ABAS_VALIDAS = ["estrategia", "conteudo", "instagram", "resultados", "reunioes"] as const
type AbaValida = (typeof ABAS_VALIDAS)[number]

const CATEGORIAS = ["conteudo", "aprovacao", "renovacao", "meta", "tarefa", "sugestao"] as const

const PESO_PRIORIDADE: Record<PrioridadeAlerta, number> = {
  critico: 300,
  atencao: 200,
  acompanhar: 100,
}

const schema = z.object({
  sugestoes: z
    .array(
      z.object({
        categoria: z
          .enum(CATEGORIAS)
          .describe("Origem da observação: conteudo, aprovacao, renovacao, meta, tarefa ou sugestao."),
        prioridade: z
          .enum(["critico", "atencao", "acompanhar"])
          .describe("critico = risco/urgência real; atencao = importante esta semana; acompanhar = melhoria proativa."),
        texto: z
          .string()
          .describe("A observação/ação concreta em 1 frase curta, específica para ESTE cliente. Sem markdown."),
        acaoLabel: z.string().describe("Rótulo curto do botão de ação (ex.: 'Programar conteúdos', 'Ver Instagram')."),
        aba: z
          .enum(ABAS_VALIDAS)
          .describe("Aba do cliente para onde o botão leva: estrategia, conteudo, instagram, resultados ou reunioes."),
      }),
    )
    .min(1)
    .max(3)
    .describe("De 1 a 3 próximas ações priorizadas para este cliente. Sempre pelo menos uma."),
})

type SinalDeterministico = { texto: string; categoria: string; prioridade: string }

// Gera as sugestões de IA para um cliente, usando todo o contexto disponível
// (Instagram, conteúdos, estratégia, metas, reuniões, histórico) mais os sinais
// determinísticos já detectados pela Central de Atenção.
async function gerarParaCliente(
  cliente: { id: string; nome: string; iniciais: string; cor: string },
  sinais: SinalDeterministico[],
): Promise<AlertaCliente[]> {
  let contextoTexto = ""
  try {
    const contexto = await montarContextoCliente(cliente.id, "próximas ações e prioridades para o cliente")
    contextoTexto = contexto?.texto ?? ""
  } catch (error) {
    console.warn("[sugestoes-ia] contexto indisponível para", cliente.nome, error instanceof Error ? error.message : error)
  }

  const { object } = await generateObject({
    model: openai(MODELO),
    schema,
    system: `${PERSONA}

# TAREFA: PRÓXIMAS AÇÕES PARA A CENTRAL DE ATENÇÃO
Você recebe o contexto completo de UM cliente ativo da agência e precisa dizer, de forma proativa, o que a equipe deveria estar fazendo por ele AGORA.

Regras:
- Sempre proponha pelo menos uma ação. Um cliente ativo nunca fica sem próximo passo.
- Seja específico e acionável, apoiado no contexto real (Instagram, conteúdos, metas, estratégia, reuniões, histórico). Nunca invente números.
- Priorize o que gera resultado para o negócio do cliente e o que evita risco (queda de cadência, meta em atraso, renovação próxima, nada programado).
- Evite repetir literalmente os sinais automáticos já detectados; use-os como ponto de partida e traga a leitura inteligente por cima.
- Cada observação é uma frase curta, direta, em português do Brasil, sem markdown.

# SINAIS AUTOMÁTICOS JÁ DETECTADOS
${sinais.length > 0 ? sinais.map((s) => `- [${s.prioridade}/${s.categoria}] ${s.texto}`).join("\n") : "Nenhum sinal crítico automático — foque em oportunidades proativas de crescimento."}

# CONTEXTO DO CLIENTE
${contextoTexto || "Sem contexto estruturado disponível. Proponha ações proativas coerentes com uma agência de marketing de conteúdo."}`,
    prompt: `Liste as próximas ações prioritárias para o cliente ${cliente.nome}.`,
  })

  const limpar = (s: string) => limparFormatacaoChat(s).trim()

  return object.sugestoes
    .map((s, indice) => {
      const prioridade = s.prioridade as PrioridadeAlerta
      const aba = (ABAS_VALIDAS as readonly string[]).includes(s.aba) ? (s.aba as AbaValida) : "estrategia"
      const texto = limpar(s.texto)
      if (!texto) return null
      const alerta: AlertaCliente = {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        iniciais: cliente.iniciais,
        cor: cliente.cor,
        categoria: (CATEGORIAS as readonly string[]).includes(s.categoria)
          ? (s.categoria as AlertaCliente["categoria"])
          : "sugestao",
        prioridade,
        texto,
        acaoLabel: limpar(s.acaoLabel) || "Ver cliente",
        acaoUrl: `/clientes/${cliente.id}?aba=${aba}`,
        // Mantém a ordenação por prioridade; desempata pela ordem sugerida pela IA.
        severidade: PESO_PRIORIDADE[prioridade] + (10 - indice),
      }
      return alerta
    })
    .filter((a): a is AlertaCliente => a !== null)
}

// Executa promessas em lotes para limitar a concorrência das chamadas ao modelo.
async function emLotes<T, R>(itens: T[], tamanho: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = []
  for (let i = 0; i < itens.length; i += tamanho) {
    const lote = itens.slice(i, i + tamanho)
    resultados.push(...(await Promise.all(lote.map(fn))))
  }
  return resultados
}

// Carrega as sugestões da Central de Atenção para todos os clientes ativos.
// Estratégia: baseline determinístico (instantâneo) + enriquecimento por IA
// com cache. Clientes sem cache vigente (ou quando `forcar`) são regenerados.
export async function carregarSugestoesAtivos(opcoes: { forcar?: boolean } = {}): Promise<AlertaCliente[]> {
  const baseline = await getClientesAtencao()

  // Agrupa o baseline por cliente ativo, preservando dados de exibição.
  const clientes = new Map<string, { id: string; nome: string; iniciais: string; cor: string; sinais: SinalDeterministico[] }>()
  for (const a of baseline) {
    const atual = clientes.get(a.clienteId) ?? {
      id: a.clienteId,
      nome: a.clienteNome,
      iniciais: a.iniciais,
      cor: a.cor,
      sinais: [] as SinalDeterministico[],
    }
    atual.sinais.push({ texto: a.texto, categoria: a.categoria, prioridade: a.prioridade })
    clientes.set(a.clienteId, atual)
  }

  const ids = [...clientes.keys()]
  if (ids.length === 0) return []

  const cache = opcoes.forcar ? new Map<string, AlertaCliente[]>() : await getSugestoesVigentes(ids)

  // Clientes que precisam de geração agora (respeitando o teto de custo).
  const pendentes = ids.filter((id) => !cache.has(id)).slice(0, MAX_GERACOES)

  if (pendentes.length > 0) {
    const geradas = await emLotes(pendentes, LOTE_CONCORRENCIA, async (id) => {
      const cliente = clientes.get(id)!
      try {
        const sugestoes = await gerarParaCliente(cliente, cliente.sinais)
        if (sugestoes.length > 0) {
          await salvarSugestoesIa({
            empresaId: id,
            modelo: MODELO,
            contexto: { sinais: cliente.sinais },
            sugestoes,
          })
        }
        return { id, sugestoes }
      } catch (error) {
        console.warn("[sugestoes-ia] falha ao gerar para", cliente.nome, error instanceof Error ? error.message : error)
        return { id, sugestoes: [] as AlertaCliente[] }
      }
    })
    for (const g of geradas) {
      if (g.sugestoes.length > 0) cache.set(g.id, g.sugestoes)
    }
  }

  // Monta a lista final: IA quando disponível, senão o baseline daquele cliente.
  const resultado: AlertaCliente[] = []
  for (const id of ids) {
    const ia = cache.get(id)
    if (ia && ia.length > 0) {
      resultado.push(...ia)
    } else {
      resultado.push(...baseline.filter((a) => a.clienteId === id))
    }
  }

  return resultado.sort((a, b) => b.severidade - a.severidade)
}
