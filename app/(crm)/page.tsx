import { Topbar } from "@/components/simple/topbar"
import { Dashboard } from "@/components/dashboard/dashboard"
import { getResumoCrm, type ResumoCrm } from "@/lib/crm-db"
import { getMembros, type Membro } from "@/lib/membros-db"

export default async function DashboardPage() {
  let resumo: ResumoCrm = { leadsEmAberto: [], qtdEmAberto: 0, valorEmAberto: 0, valorGanho: 0 }
  try {
    resumo = await getResumoCrm()
  } catch {
    resumo = { leadsEmAberto: [], qtdEmAberto: 0, valorEmAberto: 0, valorGanho: 0 }
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
      <Dashboard resumoCrm={resumo} membros={membros} />
    </>
  )
}
