import { CalendarioView } from "@/components/calendario/calendario-view"
import type { ClienteOpcao } from "@/components/calendario/evento-dialog"
import { getEventos, type Evento } from "@/lib/eventos-db"
import { getTarefas, type Tarefa } from "@/lib/tarefas-db"
import { getClientes } from "@/lib/clientes-db"
import { getMembros, type Membro } from "@/lib/membros-db"

export const dynamic = "force-dynamic"

export default async function CalendarioPage() {
  let eventos: Evento[] = []
  let tarefas: Tarefa[] = []
  let clientes: ClienteOpcao[] = []
  let membros: Membro[] = []
  let erro: string | null = null

  // Eventos é a fonte que pode não existir ainda (tabela nova): isolamos o erro
  // dela para que tarefas e o calendário continuem aparecendo normalmente.
  try {
    eventos = await getEventos()
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido ao buscar os compromissos."
  }

  try {
    const [t, cs, ms] = await Promise.all([getTarefas(), getClientes(), getMembros()])
    tarefas = t
    clientes = cs.map((c) => ({ id: c.id, nome: c.nome }))
    membros = ms
  } catch {
    // Sem tarefas/clientes/membros: o calendário ainda funciona só com eventos.
  }

  return <CalendarioView eventos={eventos} tarefas={tarefas} clientes={clientes} membros={membros} erro={erro} />
}
