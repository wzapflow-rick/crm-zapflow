import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { Providers } from "@/components/crm/providers"
import { Sidebar } from "@/components/crm/sidebar"
import { getSessao } from "@/lib/crm/auth"
import { getMembros } from "@/lib/crm/queries"
import type { Membro } from "@/lib/zapflow-data"

export const dynamic = "force-dynamic"

export default async function CrmLayout({ children }: { children: ReactNode }) {
  // Valida a assinatura do cookie (o middleware só checa presença).
  const sessao = await getSessao()
  if (!sessao) redirect("/login")

  // Monta o Membro completo do usuário logado. Tenta enriquecer com os dados
  // reais (avatar/cargo); se não encontrar, usa o básico vindo da sessão.
  const membros = await getMembros(sessao.empresaId)
  const real = membros.find((m) => m.id === sessao.id)
  const usuario: Membro =
    real ?? {
      id: sessao.id,
      nome: sessao.nome,
      papel: sessao.papel,
      iniciais: sessao.nome.slice(0, 2).toUpperCase(),
      cor: "bg-chart-1",
      online: true,
      email: sessao.email,
      telefone: "",
      cargo: "",
      entrouEm: "",
      status: "ativo",
    }

  return (
    <Providers usuario={usuario}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </Providers>
  )
}
