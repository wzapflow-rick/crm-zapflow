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
  papel: string | null
  texto: string
  created_at: string | null
}

const COLUNAS_PAPEL_COMPATIVEIS = ["papel", "role", "remetente", "tipo"] as const
let colunaPapelPromise: Promise<(typeof COLUNAS_PAPEL_COMPATIVEIS)[number] | null> | null = null
let avisoSchemaEmitido = false

function normalizarPapel(valor: string | null): "user" | "assistant" {
  const normalizado = valor?.toLowerCase().trim() ?? ""
  return ["assistant", "assistente", "ia", "bot", "simple"].includes(normalizado) ? "assistant" : "user"
}

async function detectarColunaPapel(): Promise<(typeof COLUNAS_PAPEL_COMPATIVEIS)[number] | null> {
  if (!colunaPapelPromise) {
    colunaPapelPromise = query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'cliente_chat'
         and column_name = any($1::text[])`,
      [COLUNAS_PAPEL_COMPATIVEIS],
    ).then((rows) => {
      const nomes = new Set(rows.map((row) => row.column_name))
      return COLUNAS_PAPEL_COMPATIVEIS.find((coluna) => nomes.has(coluna)) ?? null
    })
  }
  return colunaPapelPromise
}

function avisarSchemaIncompativel() {
  if (avisoSchemaEmitido) return
  avisoSchemaEmitido = true
  console.warn("[chat-db] histórico sem coluna de papel compatível; execute scripts/015-cliente-chat-papel.sql")
}

export async function getChatMensagens(empresaId: string): Promise<ChatMensagem[]> {
  const colunaPapel = await detectarColunaPapel()
  if (!colunaPapel) {
    avisarSchemaIncompativel()
    return []
  }

  const rows = await query<ChatRow>(
    `select id, ${colunaPapel} as papel, texto, created_at
     from public.cliente_chat
     where empresa_id = $1
     order by created_at asc`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    papel: normalizarPapel(r.papel),
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

  const colunaPapel = await detectarColunaPapel()
  if (!colunaPapel) {
    avisarSchemaIncompativel()
    return
  }

  await query(`insert into public.cliente_chat (empresa_id, ${colunaPapel}, texto) values ($1, $2, $3)`, [
    empresaId,
    papel,
    limpo,
  ])
}

export async function limparChat(empresaId: string): Promise<void> {
  await query(`delete from public.cliente_chat where empresa_id = $1`, [empresaId])
}
