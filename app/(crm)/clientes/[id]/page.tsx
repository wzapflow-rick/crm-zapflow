import { notFound } from "next/navigation"
import { Topbar } from "@/components/simple/topbar"
import { ClienteDetalhe } from "@/components/clientes/cliente-detalhe"
import { getClientePorId, getMetas } from "@/lib/clientes-db"
import { getMembros, type Membro } from "@/lib/membros-db"
import type { Cliente, Meta } from "@/lib/simple-data"

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

  return (
    <>
      <Topbar titulo={cliente.nome} />
      <ClienteDetalhe cliente={cliente} membros={membros} metas={metas} />
    </>
  )
}
