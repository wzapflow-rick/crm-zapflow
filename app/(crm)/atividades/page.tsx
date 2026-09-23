import { AtividadesView } from "@/components/atividades/atividades-view"
import { getAtividades, type Atividade } from "@/lib/atividades-db"
import { getMembros, type Membro } from "@/lib/membros-db"
import { seguro } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ membro?: string; modulo?: string }>
}) {
  const { membro, modulo } = await searchParams

  const [atividades, membros] = await Promise.all([
    seguro<Atividade[]>(
      getAtividades({ membroId: membro || undefined, modulo: modulo || undefined, limite: 300 }),
      [],
    ),
    seguro<Membro[]>(getMembros(), []),
  ])

  return (
    <AtividadesView
      atividades={atividades}
      membros={membros.map((m) => ({ id: m.id, nome: m.nome }))}
      filtroMembro={membro ?? ""}
      filtroModulo={modulo ?? ""}
    />
  )
}
