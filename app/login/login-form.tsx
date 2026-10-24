"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { entrarComPinAction, type EstadoLogin } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const estadoInicial: EstadoLogin = {}

function BotaoEntrar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Entrando..." : "Entrar"}
    </Button>
  )
}

export function LoginForm() {
  const [estado, formAction] = useActionState(entrarComPinAction, estadoInicial)

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="pin">Seu PIN de acesso</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="••••"
          className="h-12 text-center text-lg tracking-[0.5em]"
          aria-describedby={estado.erro ? "pin-erro" : undefined}
        />
      </div>

      {estado.erro && (
        <p id="pin-erro" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {estado.erro}
        </p>
      )}

      <BotaoEntrar />
    </form>
  )
}
