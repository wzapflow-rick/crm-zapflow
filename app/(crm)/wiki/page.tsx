import { Library } from "lucide-react"
import { EmBreve } from "@/components/simple/em-breve"

export default function WikiPage() {
  return (
    <EmBreve
      titulo="Wiki — Manual da empresa"
      icon={Library}
      descricao="Treinamento interno: como fazer onboarding, gravar clientes, editar no padrão SIMPLE, aprovar conteúdo e usar o método."
    />
  )
}
