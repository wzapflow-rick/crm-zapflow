import "server-only"
import { query } from "@/lib/db"
import {
  PRIORIDADES,
  RANK_PRIORIDADE,
  STATUS_TAREFA,
  type Prioridade,
  type StatusTarefa,
  type Tarefa,
  type TarefaInput,
} from "@/lib/tarefas-types"

export { PRIORIDADES, STATUS_TAREFA }
export type { Prioridade, StatusTarefa, Tarefa, TarefaInput }

const PRIORIDADE_IDS = PRIORIDADES.map((p) => p.id) as Prioridade[]
const STATUS_IDS = STATUS_TAREFA.map((s) => s.id) as StatusTarefa[]

function normalizarPrioridade(valor: string | null | undefined): Prioridade {
  return (PRIORIDADE_IDS.includes(valor as Prioridade) ? valor : "media") as Prioridade
}

function normalizarStatus(valor: string | null | undefined): StatusTarefa {
  return (STATUS_IDS.includes(valor as StatusTarefa) ? valor : "pendente") as StatusTarefa
}

type TarefaRow = {
  id: string
  titulo: string
  descricao: string | null
  empresa_id: string | null
  responsavel_id: string | null
  prazo: string | null
  prioridade: string | null
  status: string | null
}

function mapRow(r: TarefaRow): Tarefa {
  return {
    id: r.id,
    titulo: r.titulo,
    descricao: r.descricao ?? "",
    clienteId: r.empresa_id ?? "",
    responsavelId: r.responsavel_id ?? "",
    prazo: r.prazo ?? "",
    prioridade: normalizarPrioridade(r.prioridade),
    status: normalizarStatus(r.status),
  }
}

const SELECT_COLS = `id, titulo, descricao, empresa_id, responsavel_id,
  to_char(prazo, 'YYYY-MM-DD') as prazo, prioridade, status`

export async function getTarefas(): Promise<Tarefa[]> {
  const rows = await query<TarefaRow>(
    `select ${SELECT_COLS}
     from public.tarefas
     order by prazo asc nulls last, created_at desc`,
  )
  return rows.map(mapRow)
}

export async function criarTarefa(input: TarefaInput): Promise<void> {
  const titulo = input.titulo.trim()
  if (!titulo) return
  await query(
    `insert into public.tarefas (titulo, descricao, empresa_id, responsavel_id, prazo, prioridade, status)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      titulo,
      input.descricao?.trim() || null,
      input.clienteId || null,
      input.responsavelId || null,
      input.prazo || null,
      normalizarPrioridade(input.prioridade),
      normalizarStatus(input.status),
    ],
  )
}

export async function atualizarTarefa(id: string, input: TarefaInput): Promise<void> {
  const titulo = input.titulo.trim()
  if (!titulo) return
  await query(
    `update public.tarefas
     set titulo = $2, descricao = $3, empresa_id = $4, responsavel_id = $5,
         prazo = $6, prioridade = $7, status = $8, updated_at = now()
     where id = $1`,
    [
      id,
      titulo,
      input.descricao?.trim() || null,
      input.clienteId || null,
      input.responsavelId || null,
      input.prazo || null,
      normalizarPrioridade(input.prioridade),
      normalizarStatus(input.status),
    ],
  )
}

// Alterna entre concluída e pendente (usado pelo checkbox da lista).
export async function alternarConclusao(id: string, concluida: boolean): Promise<void> {
  await query(`update public.tarefas set status = $2, updated_at = now() where id = $1`, [
    id,
    concluida ? "concluida" : "pendente",
  ])
}

export async function excluirTarefa(id: string): Promise<void> {
  await query(`delete from public.tarefas where id = $1`, [id])
}

// ── Resumo para o Dashboard ───────────────────────────────────────────────

export type TarefaDashboard = {
  id: string
  titulo: string
  clienteNome: string | null
  responsavelId: string
  prazoLabel: string
  atrasada: boolean
  prioridade: Prioridade
}

export type ResumoTarefas = {
  urgentes: TarefaDashboard[]
  pendentes: number
}

type ResumoRow = TarefaRow & { cliente_nome: string | null }

// Rótulo amigável do prazo + flag de atraso, comparando só a data (sem horário).
function descreverPrazo(prazo: string | null): { label: string; atrasada: boolean } {
  if (!prazo) return { label: "Sem prazo", atrasada: false }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [ano, mes, dia] = prazo.split("-").map(Number)
  const data = new Date(ano, mes - 1, dia)
  const diffDias = Math.round((data.getTime() - hoje.getTime()) / 86_400_000)
  if (diffDias < 0) return { label: `Atrasada · ${dia.toString().padStart(2, "0")}/${mes.toString().padStart(2, "0")}`, atrasada: true }
  if (diffDias === 0) return { label: "Hoje", atrasada: false }
  if (diffDias === 1) return { label: "Amanhã", atrasada: false }
  return { label: `${dia.toString().padStart(2, "0")}/${mes.toString().padStart(2, "0")}`, atrasada: false }
}

export async function getResumoTarefas(limite = 5): Promise<ResumoTarefas> {
  const rows = await query<ResumoRow>(
    `select t.id, t.titulo, t.descricao, t.empresa_id, t.responsavel_id,
            to_char(t.prazo, 'YYYY-MM-DD') as prazo, t.prioridade, t.status,
            e.nome as cliente_nome
     from public.tarefas t
     left join public.empresas e on e.id = t.empresa_id
     where t.status <> 'concluida'`,
  )
  const ordenadas = rows
    .map((r) => {
      const { label, atrasada } = descreverPrazo(r.prazo)
      return {
        id: r.id,
        titulo: r.titulo,
        clienteNome: r.cliente_nome,
        responsavelId: r.responsavel_id ?? "",
        prazoLabel: label,
        atrasada,
        prioridade: normalizarPrioridade(r.prioridade),
        _prazo: r.prazo ?? "9999-99-99",
      }
    })
    .sort((a, b) => {
      // Atrasadas primeiro, depois por prioridade, depois pela data mais próxima.
      if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1
      if (RANK_PRIORIDADE[a.prioridade] !== RANK_PRIORIDADE[b.prioridade]) {
        return RANK_PRIORIDADE[a.prioridade] - RANK_PRIORIDADE[b.prioridade]
      }
      return a._prazo.localeCompare(b._prazo)
    })
  return {
    urgentes: ordenadas.slice(0, limite).map(({ _prazo, ...t }) => t),
    pendentes: rows.length,
  }
}
