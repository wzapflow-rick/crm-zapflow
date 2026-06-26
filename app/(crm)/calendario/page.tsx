import { CalendarDays } from "lucide-react"
import { EmBreve } from "@/components/simple/em-breve"

export default function CalendarioPage() {
  return (
    <EmBreve
      titulo="Calendário operacional"
      icon={CalendarDays}
      descricao="Tudo no tempo: gravações, reuniões, entregas, posts e prazos. Visão semanal e mensal, com cores por cliente e drag and drop."
    />
  )
}
