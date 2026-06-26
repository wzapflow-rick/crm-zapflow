// Tipos e constantes do CRM compartilhados entre server e client (sem "server-only").

export const ETAPAS_CRM = [
  { id: "novo", label: "Lead novo" },
  { id: "qualificado", label: "Qualificado" },
  { id: "proposta", label: "Proposta enviada" },
  { id: "negociacao", label: "Negociação" },
  { id: "ganho", label: "Ganho" },
  { id: "perdido", label: "Perdido" },
] as const

export type EtapaCrm = (typeof ETAPAS_CRM)[number]["id"]

export type Negocio = {
  id: string
  titulo: string
  contato: string
  valor: number
  origem: string
  etapa: EtapaCrm
  responsavelId: string
  nota: string
}

export type NegocioInput = {
  titulo: string
  contato?: string
  valor?: number
  origem?: string
  etapa?: string
  responsavelId?: string
  nota?: string
}
