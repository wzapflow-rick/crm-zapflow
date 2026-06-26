import { Topbar } from "@/components/simple/topbar"
import { CrmKanban } from "@/components/crm/crm-kanban"
import { getNegocios, type Negocio } from "@/lib/crm-db"
import { getMembros, type Membro } from "@/lib/membros-db"

export const dynamic = "force-dynamic"

export default async function CrmPage() {
  let negocios: Negocio[] = []
  let membros: Membro[] = []
  let erro: string | null = null

  try {
    ;[negocios, membros] = await Promise.all([getNegocios(), getMembros()])
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido ao buscar o funil."
  }

  return (
    <>
      <Topbar titulo="CRM" />
      <CrmKanban negocios={negocios} membros={membros} erro={erro} />
    </>
  )
}
