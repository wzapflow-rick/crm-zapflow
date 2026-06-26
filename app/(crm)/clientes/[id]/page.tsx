import { notFound } from "next/navigation"
import { Topbar } from "@/components/simple/topbar"
import { ClienteDetalhe } from "@/components/clientes/cliente-detalhe"
import { getClientePorId, getMetas, getEventos, getConteudos, getEstrategia } from "@/lib/clientes-db"
import { getMembros, type Membro } from "@/lib/membros-db"
import type { Cliente, ConteudoItem, Estrategia, EventoCliente, Meta } from "@/lib/simple-data"

export const dynamic = "force-dynamic"

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let cliente: Cliente | null = null
  let membros: Membro[] = []
  let metas: Meta[] = []
  try {
    ;[cliente, membros, metas] = await Promise.all([getClientePorId(id), getMembros(), getMetas(id)])
  } catch {
    cliente = null
  }

  if (!cliente) {
    notFound()
  }

  // Eventos e conteúdos em try/catch próprio: se a tabela ainda não existir, a página não quebra.
  let eventos: EventoCliente[] = []
  try {
    eventos = await getEventos(id)
  } catch {
    eventos = []
  }

  let conteudos: ConteudoItem[] = []
  try {
    conteudos = await getConteudos(id)
  } catch {
    conteudos = []
  }

  let estrategia: Estrategia = { estrategiaAtual: [], insights: [], concorrentes: [] }
  try {
    estrategia = await getEstrategia(id)
  } catch {
    estrategia = { estrategiaAtual: [], insights: [], concorrentes: [] }
  }

  return (
    <>
      <Topbar titulo={cliente.nome} />
      <ClienteDetalhe
        cliente={cliente}
        membros={membros}
        metas={metas}
        eventos={eventos}
        conteudos={conteudos}
        estrategia={estrategia}
      />
    </>
  )
}
