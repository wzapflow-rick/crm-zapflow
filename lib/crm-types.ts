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

// Origens permitidas para um negócio. Estes valores DEVEM bater com a CHECK
// constraint da coluna "negocios.origem" no banco (ver query SQL entregue no chat).
export const ORIGENS_CRM = [
  "WhatsApp",
  "Indicação",
  "Captação ativa",
  "Anúncio",
  "Instagram",
  "Site",
  "Evento",
  "Outro",
] as const

export type OrigemCrm = (typeof ORIGENS_CRM)[number]

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
