import { KanbanSquare } from "lucide-react"
import { EmBreve } from "@/components/simple/em-breve"

export default function CrmPage() {
  return (
    <EmBreve
      titulo="CRM"
      icon={KanbanSquare}
      descricao="Funil comercial em kanban: do lead novo ao fechado, com valor potencial, origem e responsável por cada negociação."
    />
  )
}
