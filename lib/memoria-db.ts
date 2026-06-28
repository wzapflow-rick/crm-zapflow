import "server-only"
import { query } from "@/lib/db"

// Client Memory: armazenamento chave-valor por seção (Marketing Intelligence Fase 1).
// Tabela: cliente_memoria (empresa_id, secao, conteudo). Uma linha por seção preenchida.

export type MemoriaCliente = Record<string, string>

type MemoriaRow = { secao: string; conteudo: string }

export async function getMemoria(empresaId: string): Promise<MemoriaCliente> {
  const rows = await query<MemoriaRow>(
    `select secao, conteudo from public.cliente_memoria where empresa_id = $1`,
    [empresaId],
  )
  const mapa: MemoriaCliente = {}
  for (const r of rows) mapa[r.secao] = r.conteudo
  return mapa
}

export async function salvarSecaoMemoria(empresaId: string, secao: string, conteudo: string): Promise<void> {
  const texto = conteudo.trim()
  if (!texto) {
    // Conteúdo vazio remove a seção.
    await query(`delete from public.cliente_memoria where empresa_id = $1 and secao = $2`, [empresaId, secao])
    return
  }
  await query(
    `insert into public.cliente_memoria (empresa_id, secao, conteudo, updated_at)
     values ($1, $2, $3, now())
     on conflict (empresa_id, secao)
     do update set conteudo = excluded.conteudo, updated_at = now()`,
    [empresaId, secao, texto],
  )
}
