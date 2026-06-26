"use client"

import { useActionState, useEffect, useState, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { salvarEstrategiaAction, type EstadoForm } from "@/app/(crm)/clientes/actions"
import type { Estrategia } from "@/lib/simple-data"

const estadoInicial: EstadoForm = { ok: false }

function BotaoSalvar({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}

export function EstrategiaDialog({
  clienteId,
  estrategia,
  trigger,
}: {
  clienteId: string
  estrategia: Estrategia
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarEstrategiaAction, estadoInicial)
  const router = useRouter()

  const [plano, setPlano] = useState("")
  const [insights, setInsights] = useState("")
  const [concorrentes, setConcorrentes] = useState("")

  // Ao abrir, carrega os valores atuais (uma linha por item).
  useEffect(() => {
    if (aberto) {
      setPlano(estrategia.estrategiaAtual.join("\n"))
      setInsights(estrategia.insights.join("\n"))
      setConcorrentes(estrategia.concorrentes.join("\n"))
    }
  }, [aberto, estrategia])

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar estratégia</DialogTitle>
          <DialogDescription>
            Escreva um item por linha. As mudanças são salvas no banco da SIMPLE.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-5">
          <input type="hidden" name="id" value={clienteId} />

          <div className="grid gap-1.5">
            <Label htmlFor="estrategiaAtual">Plano atual</Label>
            <Textarea
              id="estrategiaAtual"
              name="estrategiaAtual"
              rows={5}
              placeholder={"Um item por linha.\nEx.: Reels educativos 3x por semana"}
              value={plano}
              onChange={(e) => setPlano(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="insights">Insights</Label>
            <Textarea
              id="insights"
              name="insights"
              rows={4}
              placeholder={"Um item por linha.\nEx.: Carrosséis de bastidores têm 2x mais salvamentos"}
              value={insights}
              onChange={(e) => setInsights(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="concorrentes">Concorrentes acompanhados</Label>
            <Textarea
              id="concorrentes"
              name="concorrentes"
              rows={3}
              placeholder={"Um por linha.\nEx.: Atelier Mata"}
              value={concorrentes}
              onChange={(e) => setConcorrentes(e.target.value)}
            />
          </div>

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar>Salvar estratégia</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
