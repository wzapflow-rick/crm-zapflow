// Tipos e constantes de Tarefas compartilhados entre server e client (sem "server-only").

export const PRIORIDADES = [
  { id: "alta", label: "Alta" },
  { id: "media", label: "Média" },
  { id: "baixa", label: "Baixa" },
] as const

export type Prioridade = (typeof PRIORIDADES)[number]["id"]

export const STATUS_TAREFA = [
  { id: "pendente", label: "A fazer" },
  { id: "fazendo", label: "Em andamento" },
  { id: "concluida", label: "Concluída" },
] as const

export type StatusTarefa = (typeof STATUS_TAREFA)[number]["id"]

// Ordem de urgência (menor = mais urgente) usada para ordenar listas.
export const RANK_PRIORIDADE: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 }

export type Tarefa = {
  id: string
  titulo: string
  descricao: string
  clienteId: string
  responsavelId: string
  prazo: string // YYYY-MM-DD ou "" quando sem prazo
  prioridade: Prioridade
  status: StatusTarefa
}

export type TarefaInput = {
  titulo: string
  descricao?: string
  clienteId?: string
  responsavelId?: string
  prazo?: string
  prioridade?: string
  status?: string
}
