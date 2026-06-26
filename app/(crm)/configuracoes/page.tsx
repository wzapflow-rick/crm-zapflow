import { Settings } from "lucide-react"
import { EmBreve } from "@/components/simple/em-breve"

export default function ConfiguracoesPage() {
  return (
    <EmBreve
      titulo="Configurações"
      icon={Settings}
      descricao="Usuários (os 3 fundadores), permissões, branding do sistema, notificações e integrações futuras."
    />
  )
}
