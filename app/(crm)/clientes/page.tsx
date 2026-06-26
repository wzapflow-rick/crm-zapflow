import { Users } from "lucide-react"
import { EmBreve } from "@/components/simple/em-breve"

export default function ClientesPage() {
  return (
    <EmBreve
      titulo="Clientes"
      icon={Users}
      descricao="O core do SIMPLE OS: uma página por cliente com visão geral, calendário, conteúdo, estratégia, arquivos e resultados. Vamos construir este módulo na próxima leva."
    />
  )
}
