import "server-only"
import { query } from "@/lib/db"
import { TIPOS_EVENTO, normalizarTipo, type Evento, type EventoInput } from "@/lib/eventos-types"

export { TIPOS_EVENTO }
export type { Evento, EventoInput }

type EventoRow = {
  id: string
  titulo: string
  descricao: string | null
  tipo: string | null
  data: string | null
  hora: string | null
  empresa_id: string | null
  responsavel_id: string | null
}

function mapRow(r: EventoRow): Evento {
  return {
    id: r.id,
    titulo: r.titulo,
    descricao: r.descricao ?? "",
    tipo: normalizarTipo(r.tipo),
    data: r.data ?? "",
    hora: r.hora ?? "",
    clienteId: r.empresa_id ?? "",
    responsavelId: r.responsavel_id ?? "",
  }
}

// Observação: o PostgreSQL não possui to_char para o tipo `time`, então usamos
// casts para texto. `data::text` de uma coluna date já sai como YYYY-MM-DD e
// substring(hora::text, 1, 5) extrai HH:MM de um time (ou de text), de forma robusta.
const SELECT_COLS = `id, titulo, descricao, tipo,
  data::text as data,
  substring(hora::text from 1 for 5) as hora,
  empresa_id, responsavel_id`

export async function getEventos(): Promise<Evento[]> {
  const rows = await query<EventoRow>(
    `select ${SELECT_COLS}
     from public.eventos
     order by data asc nulls last, hora asc nulls last`,
  )
  return rows.map(mapRow)
}

export async function criarEvento(input: EventoInput): Promise<void> {
  const titulo = input.titulo.trim()
  if (!titulo) return
  await query(
    `insert into public.eventos (titulo, descricao, tipo, data, hora, empresa_id, responsavel_id)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      titulo,
      input.descricao?.trim() || null,
      normalizarTipo(input.tipo),
      input.data || null,
      input.hora || null,
      input.clienteId || null,
      input.responsavelId || null,
    ],
  )
}

export async function atualizarEvento(id: string, input: EventoInput): Promise<void> {
  const titulo = input.titulo.trim()
  if (!titulo) return
  await query(
    `update public.eventos
     set titulo = $2, descricao = $3, tipo = $4, data = $5, hora = $6,
         empresa_id = $7, responsavel_id = $8, updated_at = now()
     where id = $1`,
    [
      id,
      titulo,
      input.descricao?.trim() || null,
      normalizarTipo(input.tipo),
      input.data || null,
      input.hora || null,
      input.clienteId || null,
      input.responsavelId || null,
    ],
  )
}

export async function excluirEvento(id: string): Promise<void> {
  await query(`delete from public.eventos where id = $1`, [id])
}
