import "server-only"
import { query } from "@/lib/db"

// Mensagens do chat estratégico por cliente — uso INTERNO da SIMPLE.
// Nunca exposto no portal do cliente.
export type ChatMensagem = {
  id: string
  papel: "user" | "assistant"
  texto: string
  criadoEm: string // ISO
}

type ChatRow = {
  id: string
  papel: string
  texto: string
  created_at: string | null
}

export async function getChatMensagens(empresaId: string): Promise<ChatMensagem[]> {
  const rows = await query<ChatRow>(
    `select id, papel, texto, created_at
     from public.cliente_chat
     where empresa_id = $1
     order by created_at asc`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    papel: r.papel === "assistant" ? "assistant" : "user",
    texto: r.texto,
    criadoEm: r.created_at ?? new Date().toISOString(),
  }))
}

export async function salvarChatMensagem(
  empresaId: string,
  papel: "user" | "assistant",
  texto: string,
): Promise<void> {
  const limpo = texto.trim()
  if (!limpo) return
  await query(`insert into public.cliente_chat (empresa_id, papel, texto) values ($1, $2, $3)`, [
    empresaId,
    papel,
    limpo,
  ])
}

export async function limparChat(empresaId: string): Promise<void> {
  await query(`delete from public.cliente_chat where empresa_id = $1`, [empresaId])
}
