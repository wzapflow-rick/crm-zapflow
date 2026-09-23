import Image from "next/image"
import { redirect } from "next/navigation"
import { getUsuarioAtual } from "@/lib/sessao"
import { LoginForm } from "./login-form"

export const metadata = {
  title: "Entrar · SIMPLE OS",
}

export default async function LoginPage() {
  const usuario = await getUsuarioAtual()
  if (usuario) redirect("/")

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo-simple-icon.png"
            alt="SIMPLE"
            width={48}
            height={48}
            priority
            className="h-12 w-12 rounded-xl"
          />
          <h1 className="mt-4 font-serif text-2xl font-medium tracking-tight text-foreground">SIMPLE OS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Digite seu PIN para entrar na operação.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Cada membro da equipe tem um PIN próprio. Peça o seu a um administrador em Configurações · Equipe.
        </p>
      </div>
    </main>
  )
}
