"use client"

import { useActionState } from "react"
import { entrar, entrarDemo, type EstadoLogin } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogIn, ShieldCheck, Headset } from "lucide-react"

export function LoginForm({ demoLiberada }: { demoLiberada: boolean }) {
  const [estado, formAction, pendente] = useActionState<EstadoLogin, FormData>(
    entrar,
    {},
  )

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            E-mail
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@zapflow.app"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="senha" className="text-sm font-medium text-foreground">
            Senha
          </label>
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        {estado.erro ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {estado.erro}
          </p>
        ) : null}

        <Button type="submit" className="mt-1 w-full gap-2" disabled={pendente}>
          <LogIn className="h-4 w-4" />
          {pendente ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      {demoLiberada ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Demonstração
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => entrarDemo("admin")}
            >
              <ShieldCheck className="h-4 w-4" />
              Entrar como Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => entrarDemo("atendente")}
            >
              <Headset className="h-4 w-4" />
              Entrar como Atendente
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground text-pretty">
            Atalhos disponíveis fora de produção, para testar os papéis sem banco.
          </p>
        </div>
      ) : null}
    </div>
  )
}
