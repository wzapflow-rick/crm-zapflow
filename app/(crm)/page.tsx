import { Topbar } from "@/components/crm/topbar"
import { Overview } from "@/components/crm/overview"
import {
  getEmpresaAtivaId,
  getConversas,
  getTarefas,
  getEventos,
  getMembros,
} from "@/lib/crm/queries"

// CRM com dados ao vivo: renderiza por requisição (lê o banco a cada acesso),
// nunca como HTML estático congelado no build.
export const dynamic = "force-dynamic"

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
