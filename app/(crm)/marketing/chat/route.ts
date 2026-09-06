import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  convertToModelMessages,
  type UIMessage,
} from "ai"
import { openai } from "@ai-sdk/openai"
import { PERSONA } from "@/lib/persona"
import { montarContextoCliente } from "@/lib/contexto-cliente"
import { salvarChatMensagem } from "@/lib/chat-db"
import { avaliarECorrigirResposta, MODELO_CHAT } from "@/lib/avaliacao-resposta-ia"

export const maxDuration = 120

function textoDaMensagem(msg: UIMessage | undefined): string {
  if (!msg?.parts) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

export async function POST(req: Request) {
  const { messages, empresaId }: { messages: UIMessage[]; empresaId?: string } = await req.json()

  if (!empresaId) {
    return new Response("Cliente não informado.", { status: 400 })
  }

  const ultimaMensagem = messages[messages.length - 1]
  const consulta = ultimaMensagem?.role === "user" ? textoDaMensagem(ultimaMensagem) : ""
  const historicoConversa = messages
    .slice(Math.max(0, messages.length - 5), -1)
    .map((mensagem) => `${mensagem.role === "assistant" ? "Assistente" : "Usuário"}: ${textoDaMensagem(mensagem)}`)
    .join("\n")
  const contexto = await montarContextoCliente(empresaId, consulta)
  if (!contexto) {
    return new Response("Cliente não encontrado.", { status: 404 })
  }

  const system = `${PERSONA}

# CONTEXTO DO CLIENTE ATUAL
Você está em uma conversa estratégica sobre o cliente abaixo. Use TUDO o que sabe sobre ele para responder com precisão e profundidade, como se tivesse participado de todas as reuniões desde o primeiro dia. Nunca peça informações que já estão aqui. Quando fizer sentido, conecte sua resposta às metas, ao histórico e aos resultados deste cliente.

# POLÍTICA DE EVIDÊNCIAS
- Os dados do cliente atual têm prioridade sobre conhecimento genérico, dados globais ou suposições.
- Em análises factuais de Instagram, informe números, período, tipo de publicação e tamanho da amostra quando disponíveis.
- Não diga que um formato ou tema "funciona" apenas porque teve um post de destaque; trate isso como hipótese quando a amostra for pequena.
- Em análises factuais, se uma métrica não estiver disponível, escreva "sem dado" em vez de estimar e diferencie dado observado, interpretação e próximo experimento recomendado.
- Em entregas criativas, use as evidências disponíveis como direção estratégica, sem exigir métricas para executar o pedido.

# CONTINUIDADE E MELHOR ESFORÇO
- Interprete confirmações curtas como "sim", "é disso que preciso" ou "pode fazer" à luz das mensagens anteriores e execute integralmente a entrega oferecida.
- Em pedidos criativos ou operacionais, nunca recuse por haver poucos dados. Use todo o contexto disponível, complete as lacunas com escolhas estratégicas razoáveis e apresente essas escolhas como sugestões, não como fatos do cliente.
- Se você oferecer espontaneamente criar roteiros, ideias, planos ou qualquer outro material e o usuário aceitar, entregue o material na resposta seguinte sem pedir novamente informações que já constam no contexto.

# APRESENTAÇÃO DA RESPOSTA
Responda em texto simples, claro e organizado em parágrafos curtos. Não use Markdown, hashtags, asteriscos, cerquilhas, tabelas, blocos de código ou marcadores com símbolos. Quando precisar enumerar itens, use apenas números seguidos de ponto. Nunca exiba caracteres de formatação ao usuário.

${contexto.texto}`

  // Persiste a última mensagem do usuário antes de gerar a resposta.
  const ultima = messages[messages.length - 1]
  if (ultima?.role === "user") {
    await salvarChatMensagem(empresaId, "user", textoDaMensagem(ultima)).catch(() => {})
  }

  try {
    const { text: respostaInicial } = await generateText({
      model: openai(MODELO_CHAT),
      system,
      messages: await convertToModelMessages(messages),
    })
    const resultado = await avaliarECorrigirResposta({
      empresaId,
      pergunta: consulta,
      contexto: system,
      historicoConversa,
      respostaInicial,
    })
    await salvarChatMensagem(empresaId, "assistant", resultado.respostaFinal).catch(() => {})

    const stream = createUIMessageStream<UIMessage>({
      originalMessages: messages,
      execute: ({ writer }) => {
        const id = crypto.randomUUID()
        writer.write({ type: "text-start", id })
        writer.write({ type: "text-delta", id, delta: resultado.respostaFinal })
        writer.write({ type: "text-end", id })
      },
      onError: () => "Não foi possível apresentar a resposta validada.",
    })
    return createUIMessageStreamResponse({ stream })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "erro desconhecido"
    console.error("[chat-estrategico] falha no pipeline validado", {
      empresaId,
      erro: mensagem,
    })

    if (/401|incorrect api key|invalid.*key|authentication/i.test(mensagem)) {
      return new Response("A autenticação com a OpenAI falhou. Verifique a configuração do servidor.", { status: 502 })
    }
    if (/429|rate limit|quota|billing/i.test(mensagem)) {
      return new Response("A OpenAI atingiu o limite de uso no momento. Aguarde um pouco e tente novamente.", { status: 429 })
    }
    if (/model|does not exist|access/i.test(mensagem)) {
      return new Response("O modelo de IA está temporariamente indisponível para esta conta.", { status: 502 })
    }
    return new Response("Não foi possível gerar e validar a resposta. Tente novamente.", { status: 500 })
  }
}
