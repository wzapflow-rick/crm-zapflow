import { Topbar } from "@/components/simple/topbar"
import { Equipe } from "@/components/configuracoes/equipe"
import { getMembros, type Membro } from "@/lib/membros-db"

export const dynamic = "force-dynamic"

export default async function ConfiguracoesPage() {
  let membros: Membro[] = []
  try {
    membros = await getMembros()
  } catch {
    membros = []
  }

  return (
    <>
      <Topbar titulo="Configurações" />
      <Equipe membros={membros} />
    </>
  )
}
