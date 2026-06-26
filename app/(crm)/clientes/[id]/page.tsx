import { notFound } from "next/navigation"
import { Topbar } from "@/components/simple/topbar"
import { ClienteDetalhe } from "@/components/clientes/cliente-detalhe"
import { getClientePorId } from "@/lib/clientes-db"
import { getMembros, type Membro } from "@/lib/membros-db"
import type { Cliente } from "@/lib/simple-data"

export const dynamic = "force-dynamic"

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let cliente: Cliente | null = null
  let membros: Membro[] = []
  try {
    ;[cliente, membros] = await Promise.all([getClientePorId(id), getMembros()])
  } catch {
    cliente = null
  }

  if (!cliente) {
    notFound()
  }

  return (
    <>
      <Topbar titulo={cliente.nome} />
      <ClienteDetalhe cliente={cliente} membros={membros} />
    </>
  )
}
