import { redirect } from "next/navigation"
import { Zap } from "lucide-react"
import { getSessao, demoLiberada } from "@/lib/crm/auth"
import { LoginForm } from "@/components/crm/login-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Entrar — ZapFlow CRM",
}

export default async function LoginPage() {
  // Já logado? Vai direto para o CRM.
  const sessao = await getSessao()
  if (sessao) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-sidebar-foreground">
              ZapFlow CRM
            </h1>
            <p className="text-sm text-sidebar-foreground/70 text-pretty">
              Acesse o painel da sua equipe
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <LoginForm demoLiberada={demoLiberada} />
        </div>

        <p className="mt-6 text-center text-xs text-sidebar-foreground/60 text-pretty">
          Acesso restrito. Novos membros são convidados por um administrador.
        </p>
      </div>
    </main>
  )
}
