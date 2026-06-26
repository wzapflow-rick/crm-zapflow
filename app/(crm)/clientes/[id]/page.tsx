import { notFound } from "next/navigation"
import { Topbar } from "@/components/simple/topbar"
import { ClienteDetalhe } from "@/components/clientes/cliente-detalhe"
import { getClientePorId } from "@/lib/clientes-db"

export const dynamic = "force-dynamic"

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let cliente = null
  try {
    cliente = await getClientePorId(id)
  } catch {
    cliente = null
  }

  if (!cliente) {
    notFound()
  }

  return (
    <>
      <Topbar titulo={cliente.nome} />
      <ClienteDetalhe cliente={cliente} />
    </>
  )
}
