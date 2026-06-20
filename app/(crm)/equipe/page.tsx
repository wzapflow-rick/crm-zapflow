import { Equipe } from "@/components/crm/equipe"
import {
  getEmpresaAtivaId,
  getMembros,
  getConversas,
  getNegocios,
  getTarefas,
} from "@/lib/crm/queries"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Equipe — ZapFlow CRM",
}

export default async function EquipePage() {
  const empresaId = (await getEmpresaAtivaId()) ?? "demo"
  const [membros, conversas, negocios, tarefas] = await Promise.all([
    getMembros(empresaId),
    getConversas(empresaId),
    getNegocios(empresaId),
    getTarefas(empresaId),
  ])

  return (
    <Equipe
      membrosIniciais={membros}
      conversas={conversas}
      negocios={negocios}
      tarefas={tarefas}
    />
  )
}
