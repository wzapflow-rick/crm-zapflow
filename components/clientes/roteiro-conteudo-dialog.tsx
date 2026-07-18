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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { salvarRoteiroConteudoAction, type EstadoForm } from "@/app/(crm)/clientes/actions"

const estadoInicial: EstadoForm = { ok: false }

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar roteiro"}
    </Button>
  )
}

export function RoteiroConteudoDialog({
  clienteId,
  conteudoId,
  titulo,
  formato,
  roteiro,
  trigger,
}: {
  clienteId: string
  conteudoId: string
  titulo: string
  formato: string
  roteiro: string
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState(roteiro)
  const [estado, formAction] = useActionState(salvarRoteiroConteudoAction, estadoInicial)
  const router = useRouter()

  // Recarrega o roteiro atual sempre que o diálogo abre.
  useEffect(() => {
    if (aberto) setValor(roteiro)
  }, [aberto, roteiro])

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
          <DialogTitle className="text-pretty">{titulo}</DialogTitle>
          <DialogDescription>
            Roteiro do conteúdo ({formato}). Detalhe falas, cenas, CTA, legenda e sequência de cortes.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="conteudoId" value={conteudoId} />

          <Textarea
            name="roteiro"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            rows={12}
            placeholder="Escreva o roteiro do conteúdo aqui..."
            className="field-sizing-fixed resize-y"
          />

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
