import "server-only"
import { query } from "@/lib/db"

export type Membro = {
  id: string
  nome: string
  iniciais: string
  cor: string
  cargo: string
}

type MembroRow = {
  id: string
  nome: string | null
  iniciais: string | null
  cor: string | null
  cargo: string | null
}

const CORES = ["bg-primary", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]

function corPara(nome: string) {
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % CORES.length
  return CORES[h]
}

function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "??"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/**
 * Lista os membros do time (usados como responsáveis pelos clientes).
 * Retorna lista vazia em caso de erro/banco indisponível.
 */
export async function getMembros(): Promise<Membro[]> {
  try {
    const rows = await query<MembroRow>(
      `select id, nome, iniciais, cor, cargo
       from public.equipe
       order by nome asc`,
    )
    return rows.map((r) => {
      const nome = r.nome ?? "Sem nome"
      return {
        id: r.id,
        nome,
        iniciais: r.iniciais || iniciaisDe(nome),
        cor: r.cor || corPara(nome),
        cargo: r.cargo ?? "",
      }
    })
  } catch {
    return []
  }
}

export async function getMembroPorId(id: string | null | undefined): Promise<Membro | null> {
  if (!id) return null
  const membros = await getMembros()
  return membros.find((m) => m.id === id) ?? null
}

export async function criarMembro(input: { nome: string; cargo?: string }): Promise<void> {
  const nome = input.nome.trim()
  await query(
    `insert into public.equipe (nome, cargo, iniciais, cor)
     values ($1, $2, $3, $4)`,
    [nome, input.cargo?.trim() || null, iniciaisDe(nome), corPara(nome)],
  )
}

export async function atualizarMembro(id: string, input: { nome: string; cargo?: string }): Promise<void> {
  const nome = input.nome.trim()
  await query(
    `update public.equipe
     set nome = $2, cargo = $3, iniciais = $4
     where id = $1`,
    [id, nome, input.cargo?.trim() || null, iniciaisDe(nome)],
  )
}

export async function excluirMembro(id: string): Promise<void> {
  await query(`delete from public.equipe where id = $1`, [id])
}
