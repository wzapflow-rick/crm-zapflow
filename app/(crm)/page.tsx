import { Topbar } from "@/components/simple/topbar"
import { Dashboard } from "@/components/dashboard/dashboard"
import { seguro } from "@/lib/db"
import { getResumoCrm, type ResumoCrm } from "@/lib/crm-db"
import { getResumoTarefas, type ResumoTarefas } from "@/lib/tarefas-db"
import { getResumoFinanceiro, type ResumoFinanceiro } from "@/lib/financeiro-db"
import { getClientes } from "@/lib/clientes-db"
import { getProximasGravacoes, type ProximaGravacao } from "@/lib/eventos-db"
import { getMembros, type Membro } from "@/lib/membros-db"
import type { Cliente } from "@/lib/simple-data"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  // Todas as buscas em paralelo: uma ida ao banco em vez de 6 em série.
  const [resumo, resumoTarefas, resumoFinanceiro, clientes, proximasGravacoes, membros] = await Promise.all([
    seguro<ResumoCrm>(getResumoCrm(), { leadsEmAberto: [], qtdEmAberto: 0, valorEmAberto: 0, valorGanho: 0 }),
    seguro<ResumoTarefas>(getResumoTarefas(), { urgentes: [], pendentes: 0 }),
    seguro<ResumoFinanceiro | null>(getResumoFinanceiro(), null),
    seguro<Cliente[]>(getClientes(), []),
    seguro<ProximaGravacao[]>(getProximasGravacoes(), []),
    seguro<Membro[]>(getMembros(), []),
  ])

  const totalClientes = clientes.length
  const clientesAtivos = clientes.filter((c) => c.recorrente && c.status === "ativo").length

  return (
    <>
      <Topbar titulo="Dashboard" />
      <Dashboard
        resumoCrm={resumo}
        resumoTarefas={resumoTarefas}
        resumoFinanceiro={resumoFinanceiro}
        totalClientes={totalClientes}
        clientesAtivos={clientesAtivos}
        proximasGravacoes={proximasGravacoes}
        membros={membros}
      />
    </>
  )
}
