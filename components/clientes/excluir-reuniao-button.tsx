"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { excluirReuniaoAction, type EstadoReuniao } from "@/app/(crm)/clientes/reunioes-actions"

const estadoInicial: EstadoReuniao = { ok: false }

function Botao() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      disabled={pending}
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
      aria-label="Excluir reunião"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

export function ExcluirReuniaoButton({ id, clienteId }: { id: string; clienteId: string }) {
  const [estado, formAction] = useActionState(excluirReuniaoAction, estadoInicial)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) router.refresh()
  }, [estado, router])

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Excluir esta reunião? Esta ação não pode ser desfeita.")) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="empresaId" value={clienteId} />
      <Botao />
    </form>
  )
}
