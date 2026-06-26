import { Topbar } from "@/components/simple/topbar"
import { ClientesLista } from "@/components/clientes/clientes-lista"
import { getClientes } from "@/lib/clientes-db"
import { getMembros, type Membro } from "@/lib/membros-db"
import type { Cliente } from "@/lib/simple-data"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  let clientes: Cliente[] = []
  let membros: Membro[] = []
  let erro: string | null = null

  try {
    ;[clientes, membros] = await Promise.all([getClientes(), getMembros()])
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido ao buscar clientes."
  }

  return (
    <>
      <Topbar titulo="Clientes" />
      <ClientesLista clientes={clientes} membros={membros} erro={erro} />
    </>
  )
}
