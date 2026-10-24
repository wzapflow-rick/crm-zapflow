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
  horaFim: string // HH:MM ("" quando não informado); usado para calcular a duração
  clienteId: string
  responsaveisIds: string[] // pode ter vários responsáveis
  concluido: boolean // marcado no checklist de Tarefas
}

export type EventoInput = {
  titulo: string
  descricao?: string
  tipo?: string
  data?: string
  hora?: string
  horaFim?: string
  clienteId?: string
  responsaveisIds?: string[]
}

// ── Item unificado do calendário (evento próprio OU tarefa por prazo) ──────────

// Gravação enriquecida para o card "Próximas gravações" do Dashboard.
export type ProximaGravacao = {
  id: string
  titulo: string
  data: string // YYYY-MM-DD
  hora: string // HH:MM ("" se sem horário)
  clienteNome: string // "" quando interno (sem cliente)
}

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

// Converte "HH:MM" em minutos desde a meia-noite. Retorna null se inválido.
function minutosDe(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// Rótulo amigável da duração entre início e fim (ex.: "1h30", "45min", "2h").
// Retorna "" quando não há como calcular (falta início/fim ou fim <= início).
export function calcularDuracao(hora: string, horaFim: string): string {
  const ini = minutosDe(hora || "")
  const fim = minutosDe(horaFim || "")
  if (ini === null || fim === null) return ""
  const diff = fim - ini
  if (diff <= 0) return ""
  const h = Math.floor(diff / 60)
  const min = diff % 60
  if (h === 0) return `${min}min`
  if (min === 0) return `${h}h`
  return `${h}h${String(min).padStart(2, "0")}`
}
