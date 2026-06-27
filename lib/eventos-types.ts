// Tipos e constantes do Calendário, compartilhados entre server e client (sem "server-only").

export const TIPOS_EVENTO = [
  { id: "reuniao", label: "Reunião" },
  { id: "gravacao", label: "Gravação" },
  { id: "entrega", label: "Entrega" },
  { id: "post", label: "Publicação" },
  { id: "outro", label: "Outro" },
] as const

export type TipoEvento = (typeof TIPOS_EVENTO)[number]["id"]

export type Evento = {
  id: string
  titulo: string
  descricao: string
  tipo: TipoEvento
  data: string // YYYY-MM-DD
  hora: string // HH:MM ("" se o dia inteiro)
  clienteId: string
  responsaveisIds: string[] // pode ter vários responsáveis
}

export type EventoInput = {
  titulo: string
  descricao?: string
  tipo?: string
  data?: string
  hora?: string
  clienteId?: string
  responsaveisIds?: string[]
}

// ── Item unificado do calendário (evento próprio OU tarefa por prazo) ──────────

export type OrigemItem = "evento" | "tarefa"

export type ItemCalendario = {
  id: string
  origem: OrigemItem
  titulo: string
  data: string // YYYY-MM-DD
  hora: string // "" quando não há horário (ex.: tarefa)
  tipo: string // TipoEvento quando origem = evento; "tarefa" quando origem = tarefa
  clienteId: string
  responsaveisIds: string[]
}

// Estilo (classes Tailwind) por tipo, usado nos badges/pontos do calendário.
export const ESTILO_TIPO: Record<string, { ponto: string; chip: string; label: string }> = {
  reuniao: { ponto: "bg-chart-2", chip: "bg-chart-2/15 text-chart-2", label: "Reunião" },
  gravacao: { ponto: "bg-primary", chip: "bg-primary/10 text-primary", label: "Gravação" },
  entrega: { ponto: "bg-chart-4", chip: "bg-chart-4/15 text-chart-4", label: "Entrega" },
  post: { ponto: "bg-chart-3", chip: "bg-chart-3/15 text-chart-3", label: "Publicação" },
  outro: { ponto: "bg-muted-foreground", chip: "bg-muted text-muted-foreground", label: "Outro" },
  tarefa: { ponto: "bg-chart-5", chip: "bg-chart-5/15 text-chart-5", label: "Tarefa" },
}

export function normalizarTipo(valor: string | null | undefined): TipoEvento {
  const ids = TIPOS_EVENTO.map((t) => t.id) as string[]
  return (ids.includes(valor ?? "") ? valor : "reuniao") as TipoEvento
}
