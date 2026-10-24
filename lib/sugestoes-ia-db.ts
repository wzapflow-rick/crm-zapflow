import "server-only"

import { query } from "@/lib/db"
import type { AlertaCliente } from "@/lib/clientes-db"

// Cache das sugestões geradas por IA para a Central de Atenção.
// Evita chamar o modelo a cada carregamento do dashboard: uma vez gerada,
// a sugestão vale por algumas horas (TTL) e é relida do banco.

export type SugestaoIaCacheada = {
  empresaId: string
  geradoEm: string
  expiraEm: string
  sugestoes: AlertaCliente[]
}

type SugestaoRow = {
  empresa_id: string
  gerado_em: string
  expira_em: string
  sugestoes: AlertaCliente[] | null
}

// Lê o cache VIGENTE (mais recente e ainda não expirado) de cada empresa.
// Retorna um mapa empresaId -> sugestões para consulta O(1) no dashboard.
export async function getSugestoesVigentes(empresaIds?: string[]): Promise<Map<string, AlertaCliente[]>> {
  const mapa = new Map<string, AlertaCliente[]>()
  try {
    const filtro = empresaIds && empresaIds.length > 0
    const rows = await query<SugestaoRow>(
      `SELECT DISTINCT ON (empresa_id)
              empresa_id, gerado_em, expira_em, sugestoes
       FROM public.cliente_sugestao_ia
       WHERE expira_em > now()
       ${filtro ? "AND empresa_id = ANY($1::uuid[])" : ""}
       ORDER BY empresa_id, gerado_em DESC`,
      filtro ? [empresaIds] : [],
    )
    for (const row of rows) {
      if (Array.isArray(row.sugestoes) && row.sugestoes.length > 0) {
        mapa.set(row.empresa_id, row.sugestoes)
      }
    }
  } catch (error) {
    console.warn("[sugestoes-ia] cache indisponível:", error instanceof Error ? error.message : error)
  }
  return mapa
}

// Persiste as sugestões geradas para uma empresa, com janela de validade (TTL).
export async function salvarSugestoesIa(input: {
  empresaId: string
  modelo: string
  contexto: Record<string, unknown>
  sugestoes: AlertaCliente[]
  ttlHoras?: number
}): Promise<void> {
  const ttl = Math.min(Math.max(input.ttlHoras ?? 12, 1), 72)
  try {
    await query(
      `INSERT INTO public.cliente_sugestao_ia
        (empresa_id, gerado_em, expira_em, modelo, contexto, sugestoes)
       VALUES ($1, now(), now() + ($2 || ' hours')::interval, $3, $4::jsonb, $5::jsonb)`,
      [
        input.empresaId,
        String(ttl),
        input.modelo,
        JSON.stringify(input.contexto),
        JSON.stringify(input.sugestoes),
      ],
    )
  } catch (error) {
    console.warn("[sugestoes-ia] não foi possível salvar o cache:", error instanceof Error ? error.message : error)
  }
}
