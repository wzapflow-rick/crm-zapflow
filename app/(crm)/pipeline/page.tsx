import { Pipeline } from "@/components/crm/pipeline"
import { getEmpresaAtivaId, getNegocios, getMembros } from "@/lib/crm/queries"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Pipeline de vendas — ZapFlow CRM",
}

export default async function PipelinePage() {
  const empresaId = (await getEmpresaAtivaId()) ?? "demo"
  const [negocios, membros] = await Promise.all([
    getNegocios(empresaId),
    getMembros(empresaId),
  ])

  return <Pipeline negociosIniciais={negocios} membros={membros} />
}
