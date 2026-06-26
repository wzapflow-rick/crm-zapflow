import "server-only"
import { query } from "@/lib/db"
import { ETAPAS_CRM, type EtapaCrm, type Negocio, type NegocioInput } from "@/lib/crm-types"

export { ETAPAS_CRM }
export type { EtapaCrm, Negocio, NegocioInput }

const ETAPA_IDS = ETAPAS_CRM.map((e) => e.id) as EtapaCrm[]

function normalizarEtapa(valor: string | null): EtapaCrm {
  return (ETAPA_IDS.includes(valor as EtapaCrm) ? valor : "novo") as EtapaCrm
}

type NegocioRow = {
  id: string
  titulo: string
  contato: string | null
  valor: string | null
  origem: string | null
  etapa: string | null
  responsavel_id: string | null
  nota: string | null
}

export async function getNegocios(): Promise<Negocio[]> {
  const rows = await query<NegocioRow>(
    `select id, titulo, contato, valor, origem, etapa, responsavel_id, nota
     from public.negocios
     order by posicao asc, created_at asc`,
  )
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    contato: r.contato ?? "",
    valor: r.valor ? Number(r.valor) : 0,
    origem: r.origem ?? "",
    etapa: normalizarEtapa(r.etapa),
    responsavelId: r.responsavel_id ?? "",
    nota: r.nota ?? "",
  }))
}

export async function criarNegocio(input: NegocioInput): Promise<void> {
  const titulo = input.titulo.trim()
  if (!titulo) return
  await query(
    `insert into public.negocios (titulo, contato, valor, origem, etapa, responsavel_id, nota, posicao)
     values ($1, $2, $3, $4, $5, $6, $7,
       coalesce((select max(posicao) from public.negocios), -1) + 1)`,
    [
      titulo,
      input.contato?.trim() || null,
      input.valor || 0,
      input.origem?.trim() || null,
      normalizarEtapa(input.etapa ?? null),
      input.responsavelId || null,
      input.nota?.trim() || null,
    ],
  )
}

export async function atualizarNegocio(id: string, input: NegocioInput): Promise<void> {
  const titulo = input.titulo.trim()
  if (!titulo) return
  await query(
    `update public.negocios
     set titulo = $2, contato = $3, valor = $4, origem = $5, etapa = $6, responsavel_id = $7, nota = $8, updated_at = now()
     where id = $1`,
    [
      id,
      titulo,
      input.contato?.trim() || null,
      input.valor || 0,
      input.origem?.trim() || null,
      normalizarEtapa(input.etapa ?? null),
      input.responsavelId || null,
      input.nota?.trim() || null,
    ],
  )
}

// Move o negócio para outra etapa (usado pelo arrastar-e-soltar do kanban).
export async function moverNegocio(id: string, etapa: string): Promise<void> {
  await query(`update public.negocios set etapa = $2, updated_at = now() where id = $1`, [
    id,
    normalizarEtapa(etapa),
  ])
}

export async function excluirNegocio(id: string): Promise<void> {
  await query(`delete from public.negocios where id = $1`, [id])
}
