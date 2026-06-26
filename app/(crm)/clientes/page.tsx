import { Topbar } from "@/components/simple/topbar"
import { ClientesLista } from "@/components/clientes/clientes-lista"

export default function ClientesPage() {
  return (
    <>
      <Topbar titulo="Clientes" />
      <ClientesLista />
    </>
  )
}
