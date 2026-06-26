import { TarefasView } from "@/components/tarefas/tarefas-view"
import type { ClienteOpcao } from "@/components/tarefas/tarefa-dialog"
import { getTarefas, type Tarefa } from "@/lib/tarefas-db"
import { getClientes } from "@/lib/clientes-db"
import { getMembros, type Membro } from "@/lib/membros-db"

export const dynamic = "force-dynamic"

export default async function TarefasPage() {
  let tarefas: Tarefa[] = []
  let clientes: ClienteOpcao[] = []
  let membros: Membro[] = []
  let erro: string | null = null

  try {
    const [t, cs, ms] = await Promise.all([getTarefas(), getClientes(), getMembros()])
    tarefas = t
    clientes = cs.map((c) => ({ id: c.id, nome: c.nome }))
    membros = ms
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido ao buscar as tarefas."
  }

  return <TarefasView tarefas={tarefas} clientes={clientes} membros={membros} erro={erro} />
}
