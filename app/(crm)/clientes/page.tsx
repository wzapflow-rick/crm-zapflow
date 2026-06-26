import { Topbar } from "@/components/simple/topbar"
import { ClientesLista } from "@/components/clientes/clientes-lista"
import { getClientes } from "@/lib/clientes-db"
import type { Cliente } from "@/lib/simple-data"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  let clientes: Cliente[] = []
  let erro: string | null = null

  try {
    clientes = await getClientes()
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido ao buscar clientes."
  }

  return (
    <>
      <Topbar titulo="Clientes" />
      <ClientesLista clientes={clientes} erro={erro} />
    </>
  )
}
