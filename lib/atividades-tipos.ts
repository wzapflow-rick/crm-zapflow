// Tipos e utilitários puros de atividades. SEM "server-only": pode ser
// importado tanto por Server Components/actions quanto por Client Components.

export type ModuloAtividade =
  | "clientes"
  | "tarefas"
  | "crm"
  | "financeiro"
  | "conteudo"
  | "calendario"
  | "equipe"

export type AcaoAtividade = "criar" | "atualizar" | "excluir"

export type Atividade = {
  id: string
  membroId: string | null
  membroNome: string
  modulo: string
  acao: string
  entidadeTipo: string | null
  entidadeId: string | null
  entidadeNome: string | null
  descricao: string
  criadoEm: string
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
