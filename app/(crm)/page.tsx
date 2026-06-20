import { Topbar } from "@/components/crm/topbar"
import { Overview } from "@/components/crm/overview"
import {
  getEmpresaAtivaId,
  getConversas,
  getTarefas,
  getEventos,
  getMembros,
} from "@/lib/crm/queries"

export default async function HomePage() {
  const empresaId = (await getEmpresaAtivaId()) ?? "demo"
  const [conversas, tarefas, eventos, membros] = await Promise.all([
    getConversas(empresaId),
    getTarefas(empresaId),
    getEventos(empresaId),
    getMembros(empresaId),
  ])

  return (
    <>
      <Topbar titulo="Visão geral" />
      <Overview
        conversas={conversas}
        tarefas={tarefas}
        eventos={eventos}
        membros={membros}
      />
    </>
  )
}
