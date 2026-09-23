import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { Providers } from "@/components/simple/providers"
import { Sidebar } from "@/components/simple/sidebar"
import { getUsuarioAtual } from "@/lib/sessao"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const usuario = await getUsuarioAtual()
  if (!usuario) redirect("/login")

  return (
    <Providers usuarioInicial={usuario}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </div>
    </Providers>
  )
}
