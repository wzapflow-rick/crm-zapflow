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

/** Busca o membro cujo PIN de acesso corresponde ao informado (usado no login). */
export async function getMembroPorPin(pin: string): Promise<Membro | null> {
  const limpo = pin.trim()
  if (!limpo) return null
  try {
    const rows = await query<MembroRow>(
      `select id, nome, iniciais, cor, cargo
       from public.equipe
       where pin = $1
       limit 1`,
      [limpo],
    )
    const r = rows[0]
    if (!r) return null
    const nome = r.nome ?? "Sem nome"
    return {
      id: r.id,
      nome,
      iniciais: r.iniciais || iniciaisDe(nome),
      cor: r.cor || corPara(nome),
      cargo: r.cargo ?? "",
    }
  } catch {
    return null
  }
}

export async function criarMembro(input: { nome: string; cargo?: string; pin?: string }): Promise<void> {
  const nome = input.nome.trim()
  await query(
    `insert into public.equipe (nome, cargo, iniciais, cor, pin)
     values ($1, $2, $3, $4, $5)`,
    [nome, input.cargo?.trim() || null, iniciaisDe(nome), corPara(nome), input.pin?.trim() || null],
  )
}

export async function atualizarMembro(
  id: string,
  input: { nome: string; cargo?: string; pin?: string },
): Promise<void> {
  const nome = input.nome.trim()
  const pin = input.pin?.trim()
  // Só sobrescreve o PIN quando um novo valor é informado; deixar em branco mantém o atual.
  if (pin) {
    await query(
      `update public.equipe
       set nome = $2, cargo = $3, iniciais = $4, pin = $5
       where id = $1`,
      [id, nome, input.cargo?.trim() || null, iniciaisDe(nome), pin],
    )
  } else {
    await query(
      `update public.equipe
       set nome = $2, cargo = $3, iniciais = $4
       where id = $1`,
      [id, nome, input.cargo?.trim() || null, iniciaisDe(nome)],
    )
  }
}

export async function excluirMembro(id: string): Promise<void> {
  await query(`delete from public.equipe where id = $1`, [id])
}
