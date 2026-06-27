import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { PERSONA } from "@/lib/persona"
import { montarContextoCliente } from "@/lib/contexto-cliente"
import { salvarChatMensagem } from "@/lib/chat-db"

// Modelo usado no chat estratégico. Troque aqui se sua conta tiver outro acesso.
const MODELO = "gpt-4o"

export const maxDuration = 60

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

  const contexto = await montarContextoCliente(empresaId)
  if (!contexto) {
    return new Response("Cliente não encontrado.", { status: 404 })
  }

  const system = `${PERSONA}

# CONTEXTO DO CLIENTE ATUAL
Você está em uma conversa estratégica sobre o cliente abaixo. Use TUDO o que sabe sobre ele para responder com precisão e profundidade, como se tivesse participado de todas as reuniões desde o primeiro dia. Nunca peça informações que já estão aqui. Quando fizer sentido, conecte sua resposta às metas, ao histórico e aos resultados deste cliente.

${contexto.texto}`

  // Persiste a última mensagem do usuário antes de gerar a resposta.
  const ultima = messages[messages.length - 1]
  if (ultima?.role === "user") {
    await salvarChatMensagem(empresaId, "user", textoDaMensagem(ultima)).catch(() => {})
  }

  const result = streamText({
    model: openai(MODELO),
    system,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      await salvarChatMensagem(empresaId, "assistant", text).catch(() => {})
    },
  })

  return result.toUIMessageStreamResponse()
}
