import { Topbar } from "@/components/simple/topbar"
import { Dashboard } from "@/components/dashboard/dashboard"
import { getResumoCrm, type ResumoCrm } from "@/lib/crm-db"
import { getResumoTarefas, type ResumoTarefas } from "@/lib/tarefas-db"
import { getResumoFinanceiro, type ResumoFinanceiro } from "@/lib/financeiro-db"
import { getMembros, type Membro } from "@/lib/membros-db"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  let resumo: ResumoCrm = { leadsEmAberto: [], qtdEmAberto: 0, valorEmAberto: 0, valorGanho: 0 }
  try {
    resumo = await getResumoCrm()
  } catch {
    resumo = { leadsEmAberto: [], qtdEmAberto: 0, valorEmAberto: 0, valorGanho: 0 }
  }

  let resumoTarefas: ResumoTarefas = { urgentes: [], pendentes: 0 }
  try {
    resumoTarefas = await getResumoTarefas()
  } catch {
    resumoTarefas = { urgentes: [], pendentes: 0 }
  }

  let resumoFinanceiro: ResumoFinanceiro | null = null
  try {
    resumoFinanceiro = await getResumoFinanceiro()
  } catch {
    resumoFinanceiro = null
  }

  let membros: Membro[] = []
  try {
    membros = await getMembros()
  } catch {
    membros = []
  }

  return (
    <>
      <Topbar titulo="Dashboard" />
      <Dashboard
        resumoCrm={resumo}
        resumoTarefas={resumoTarefas}
        resumoFinanceiro={resumoFinanceiro}
        membros={membros}
      />
    </>
  )
}
