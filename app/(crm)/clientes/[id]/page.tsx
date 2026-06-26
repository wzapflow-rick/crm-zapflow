import { notFound } from "next/navigation"
import { Topbar } from "@/components/simple/topbar"
import { ClienteDetalhe } from "@/components/clientes/cliente-detalhe"
import { clientePorId, clientes } from "@/lib/simple-data"

export function generateStaticParams() {
  return clientes.map((c) => ({ id: c.id }))
}

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cliente = clientePorId(id)

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
