import { ListChecks } from "lucide-react"
import { EmBreve } from "@/components/simple/em-breve"

export default function TarefasPage() {
  return (
    <EmBreve
      titulo="Tarefas"
      icon={ListChecks}
      descricao="Execução diária: tarefas por cliente e internas, com prioridades, responsáveis, prazos e checklists."
    />
  )
}
