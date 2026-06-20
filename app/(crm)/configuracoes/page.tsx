import { Topbar } from "@/components/crm/topbar"
import { Configuracoes } from "@/components/crm/configuracoes"
import { getEmpresaAtivaId, getMembros } from "@/lib/crm/queries"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Configurações — ZapFlow CRM",
}

export default async function ConfiguracoesPage() {
  const empresaId = (await getEmpresaAtivaId()) ?? "demo"
  const membros = await getMembros(empresaId)

  return (
    <>
      <Topbar titulo="Configurações" />
      <Configuracoes membros={membros} />
    </>
  )
}
