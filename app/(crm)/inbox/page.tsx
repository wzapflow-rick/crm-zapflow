import { Topbar } from "@/components/crm/topbar"
import { Inbox } from "@/components/crm/inbox"
import { getEmpresaAtivaId, getConversas, getMembros } from "@/lib/crm/queries"

export default async function InboxPage() {
  const empresaId = (await getEmpresaAtivaId()) ?? "demo"
  const [conversas, membros] = await Promise.all([
    getConversas(empresaId),
    getMembros(empresaId),
  ])

  return (
    <>
      <Topbar titulo="Inbox WhatsApp" />
      <Inbox conversasIniciais={conversas} membros={membros} />
    </>
  )
}
