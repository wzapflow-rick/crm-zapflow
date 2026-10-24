import "server-only"
import { createHash } from "node:crypto"
import { query } from "@/lib/db"

// Rótulos de feedback humano por resposta da IA no chat estratégico.
export const TIPOS_FEEDBACK = ["util", "generica", "aplicada", "ajustada", "descartada"] as const
export type TipoFeedback = (typeof TIPOS_FEEDBACK)[number]

export function ehTipoFeedback(valor: unknown): valor is TipoFeedback {
  return typeof valor === "string" && (TIPOS_FEEDBACK as readonly string[]).includes(valor)
}

// A resposta é identificada pelo hash do seu texto: o mesmo conteúdo recebe o
// mesmo feedback, tanto na mensagem recém-gerada (id aleatório do cliente)
// quanto na recarregada do banco (id do registro).
export function hashResposta(texto: string): string {
  return createHash("md5").update(texto.trim()).digest("hex")
}

// Registra ou atualiza o feedback de uma resposta (upsert por cliente + hash).
export async function registrarFeedback(
  empresaId: string,
  resposta: string,
  pergunta: string,
  avaliacao: TipoFeedback,
): Promise<void> {
  const hash = hashResposta(resposta)
  await query(
    `insert into public.cliente_resposta_feedback (empresa_id, resposta_hash, resposta, pergunta, avaliacao)
     values ($1, $2, $3, $4, $5)
     on conflict (empresa_id, resposta_hash)
     do update set avaliacao = excluded.avaliacao, pergunta = excluded.pergunta, atualizado_em = now()`,
    [empresaId, hash, resposta.trim(), pergunta.trim() || null, avaliacao],
  )
}

// Remove o feedback de uma resposta (usado quando o usuário desmarca a opção).
export async function removerFeedback(empresaId: string, resposta: string): Promise<void> {
  const hash = hashResposta(resposta)
  await query(`delete from public.cliente_resposta_feedback where empresa_id = $1 and resposta_hash = $2`, [
    empresaId,
    hash,
  ])
}

// Mapa hash-da-resposta → avaliação, para exibir o estado salvo ao carregar o chat.
export async function getFeedbackDaEmpresa(empresaId: string): Promise<Record<string, TipoFeedback>> {
  const rows = await query<{ resposta_hash: string; avaliacao: string }>(
    `select resposta_hash, avaliacao from public.cliente_resposta_feedback where empresa_id = $1`,
    [empresaId],
  )
  const mapa: Record<string, TipoFeedback> = {}
  for (const row of rows) {
    if (ehTipoFeedback(row.avaliacao)) mapa[row.resposta_hash] = row.avaliacao
  }
  return mapa
}
