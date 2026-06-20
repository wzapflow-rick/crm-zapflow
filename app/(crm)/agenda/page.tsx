import { Topbar } from "@/components/crm/topbar"
import { Agenda } from "@/components/crm/agenda"
import {
  getEmpresaAtivaId,
  getEventos,
  getTarefas,
  getMembros,
} from "@/lib/crm/queries"

export default async function AgendaPage() {
  const empresaId = (await getEmpresaAtivaId()) ?? "demo"
  const [eventos, tarefas, membros] = await Promise.all([
    getEventos(empresaId),
    getTarefas(empresaId),
    getMembros(empresaId),
  ])

  return (
    <>
      <Topbar titulo="Planejamento & Agenda" />
      <Agenda
        eventosIniciais={eventos}
        tarefasIniciais={tarefas}
        membros={membros}
      />
    </>
  )
}
