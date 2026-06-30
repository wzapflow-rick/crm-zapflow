import "server-only"
import { query } from "@/lib/db"

export type EnvioCliente = {
  id: string
  titulo: string
  link: string
  descricao: string
  criadoEm: string
}

type Row = {
  id: string
  titulo: string | null
  link: string
  descricao: string | null
  created_at: string
}

function mapRow(r: Row): EnvioCliente {
  return {
    id: r.id,
    titulo: r.titulo ?? "Material enviado",
    link: r.link,
    descricao: r.descricao ?? "",
    criadoEm: r.created_at,
  }
}

// Links de material (vídeos/fotos) enviados pelo próprio cliente via portal.
// Guardamos apenas o link (Drive/WeTransfer/etc.) — zero custo de armazenamento.
export async function getEnvios(empresaId: string): Promise<EnvioCliente[]> {
  const rows = await query<Row>(
    `SELECT id, titulo, link, descricao, created_at
     FROM public.cliente_envio
     WHERE empresa_id = $1
     ORDER BY created_at DESC`,
    [empresaId],
  )
  return rows.map(mapRow)
}

// Normaliza e valida superficialmente o link enviado pelo cliente.
// Aceita apenas http(s); prefixa https:// quando o usuário cola "drive.google.com/...".
export function normalizarLink(bruto: string): string | null {
  const limpo = bruto.trim()
  if (!limpo) return null
  const comEsquema = /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`
  try {
    const url = new URL(comEsquema)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (!url.hostname.includes(".")) return null
    return url.toString()
  } catch {
    return null
  }
}

export async function adicionarEnvio(
  empresaId: string,
  dados: { titulo: string; link: string; descricao: string },
): Promise<void> {
  await query(
    `INSERT INTO public.cliente_envio (empresa_id, titulo, link, descricao)
     VALUES ($1, $2, $3, $4)`,
    [empresaId, dados.titulo.trim() || "Material enviado", dados.link, dados.descricao.trim() || null],
  )
}

// Exclusão pela equipe (uso interno).
export async function excluirEnvio(id: string, empresaId: string): Promise<void> {
  await query(`DELETE FROM public.cliente_envio WHERE id = $1 AND empresa_id = $2`, [id, empresaId])
}
