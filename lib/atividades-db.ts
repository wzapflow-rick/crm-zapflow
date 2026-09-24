import "server-only"
import { query } from "@/lib/db"
import { getUsuarioAtual } from "@/lib/sessao"
import type { Atividade, ModuloAtividade, AcaoAtividade } from "@/lib/atividades-tipos"

export { tempoRelativo } from "@/lib/atividades-tipos"
export type { Atividade, ModuloAtividade, AcaoAtividade } from "@/lib/atividades-tipos"

type AtividadeRow = {
  id: string
  membro_id: string | null
  membro_nome: string | null
  modulo: string | null
  acao: string | null
  entidade_tipo: string | null
  entidade_id: string | null
  entidade_nome: string | null
  descricao: string | null
  criado_em: string | Date
}

function mapear(r: AtividadeRow): Atividade {
  return {
    id: r.id,
    membroId: r.membro_id,
    membroNome: r.membro_nome ?? "Sistema",
    modulo: r.modulo ?? "",
    acao: r.acao ?? "",
    entidadeTipo: r.entidade_tipo,
    entidadeId: r.entidade_id,
    entidadeNome: r.entidade_nome,
    descricao: r.descricao ?? "",
    criadoEm: r.criado_em instanceof Date ? r.criado_em.toISOString() : String(r.criado_em),
  }
}

/**
 * Registra uma alteração feita no sistema, atribuída ao usuário logado.
 * Nunca lança: uma falha de log não pode derrubar a ação principal.
 */
export async function registrarAtividade(input: {
  modulo: ModuloAtividade
  acao: AcaoAtividade
  descricao: string
  entidadeTipo?: string
  entidadeId?: string | null
  entidadeNome?: string | null
}): Promise<void> {
  try {
    const usuario = await getUsuarioAtual()
    await query(
      `insert into public.atividades
         (membro_id, membro_nome, modulo, acao, entidade_tipo, entidade_id, entidade_nome, descricao)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        usuario?.id ?? null,
        usuario?.nome ?? "Sistema",
        input.modulo,
        input.acao,
        input.entidadeTipo ?? null,
        input.entidadeId ?? null,
        input.entidadeNome ?? null,
        input.descricao,
      ],
    )
  } catch (e) {
    console.warn("[atividades] falha ao registrar:", e instanceof Error ? e.message : e)
  }
}

export async function getAtividades(filtros?: {
  membroId?: string
  modulo?: string
  limite?: number
}): Promise<Atividade[]> {
  const cond: string[] = []
  const params: unknown[] = []
  if (filtros?.membroId) {
    params.push(filtros.membroId)
    cond.push(`membro_id = $${params.length}`)
  }
  if (filtros?.modulo) {
    params.push(filtros.modulo)
    cond.push(`modulo = $${params.length}`)
  }
  const where = cond.length ? `where ${cond.join(" and ")}` : ""
  params.push(Math.min(Math.max(filtros?.limite ?? 150, 1), 500))
  const rows = await query<AtividadeRow>(
    `select id, membro_id, membro_nome, modulo, acao, entidade_tipo, entidade_id, entidade_nome, descricao, criado_em
     from public.atividades
     ${where}
     order by criado_em desc
     limit $${params.length}`,
    params,
  )
  return rows.map(mapear)
}

/** Última alteração registrada para uma entidade específica (para o carimbo inline). */
export async function getUltimaAtividade(
  entidadeTipo: string,
  entidadeId: string,
): Promise<Atividade | null> {
  try {
    const rows = await query<AtividadeRow>(
      `select id, membro_id, membro_nome, modulo, acao, entidade_tipo, entidade_id, entidade_nome, descricao, criado_em
       from public.atividades
       where entidade_tipo = $1 and entidade_id = $2
       order by criado_em desc
       limit 1`,
      [entidadeTipo, entidadeId],
    )
    return rows[0] ? mapear(rows[0]) : null
  } catch {
    return null
  }
}

/** Formata uma data ISO em tempo relativo curto, em português. */
export function tempoRelativo(iso: string): string {
  const data = new Date(iso)
  const ms = Date.now() - data.getTime()
  if (!Number.isFinite(ms)) return ""
  const seg = Math.round(ms / 1000)
  if (seg < 60) return "agora mesmo"
  const min = Math.round(seg / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`
  const meses = Math.round(d / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`
  const anos = Math.round(meses / 12)
  return `há ${anos} ${anos === 1 ? "ano" : "anos"}`
}
