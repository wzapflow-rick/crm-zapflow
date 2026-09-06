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
const COLUNAS_TEXTO_COMPATIVEIS = ["texto", "mensagem", "conteudo", "message", "content"] as const
let colunasChatPromise: Promise<Set<string>> | null = null
let avisoSchemaEmitido = false

function normalizarPapel(valor: string | null): "user" | "assistant" {
  const normalizado = valor?.toLowerCase().trim() ?? ""
  return ["assistant", "assistente", "ia", "bot", "simple"].includes(normalizado) ? "assistant" : "user"
}

async function obterColunasChat(): Promise<Set<string>> {
  if (!colunasChatPromise) {
    colunasChatPromise = query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'cliente_chat'
         and column_name = any($1::text[])`,
      [[...COLUNAS_PAPEL_COMPATIVEIS, ...COLUNAS_TEXTO_COMPATIVEIS]],
    ).then((rows) => new Set(rows.map((row) => row.column_name)))
  }
  return colunasChatPromise
}

async function detectarColunasCompativeis() {
  const colunas = await obterColunasChat()
  return {
    papel: COLUNAS_PAPEL_COMPATIVEIS.find((coluna) => colunas.has(coluna)) ?? null,
    texto: COLUNAS_TEXTO_COMPATIVEIS.find((coluna) => colunas.has(coluna)) ?? null,
  }
}

function avisarSchemaIncompativel() {
  if (avisoSchemaEmitido) return
  avisoSchemaEmitido = true
  console.warn("[chat-db] histórico sem colunas compatíveis; execute scripts/016-cliente-chat-texto.sql")
}

export async function getChatMensagens(empresaId: string): Promise<ChatMensagem[]> {
  const colunas = await detectarColunasCompativeis()
  if (!colunas.papel || !colunas.texto) {
    avisarSchemaIncompativel()
    return []
  }

  const rows = await query<ChatRow>(
    `select id, ${colunas.papel} as papel, ${colunas.texto} as texto, created_at
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

  const colunas = await detectarColunasCompativeis()
  if (!colunas.papel || !colunas.texto) {
    avisarSchemaIncompativel()
    return
  }

  await query(`insert into public.cliente_chat (empresa_id, ${colunas.papel}, ${colunas.texto}) values ($1, $2, $3)`, [
    empresaId,
    papel,
    limpo,
  ])
}

export async function limparChat(empresaId: string): Promise<void> {
  await query(`delete from public.cliente_chat where empresa_id = $1`, [empresaId])
}
