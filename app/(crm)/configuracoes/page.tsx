import { Topbar } from "@/components/simple/topbar"
import { Equipe } from "@/components/configuracoes/equipe"
import { WhatsAppDiagnostico } from "@/components/configuracoes/whatsapp-diagnostico"
import { getMembros, type Membro } from "@/lib/membros-db"

export const dynamic = "force-dynamic"
// A reconexão do WhatsApp faz connect + restart + espera + connect; dá folga
// para a função serverless não ser encerrada no meio do processo.
export const maxDuration = 30

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
      <Equipe membros={membros}>
        <WhatsAppDiagnostico />
      </Equipe>
    </>
  )
}
