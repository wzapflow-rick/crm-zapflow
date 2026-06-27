"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { excluirRegistroHistoricoAction, type EstadoHistorico } from "@/app/(crm)/clientes/historico-actions"

const estadoInicial: EstadoHistorico = { ok: false }

function Botao() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      disabled={pending}
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
      aria-label="Excluir registro"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

export function ExcluirRegistroButton({ id, clienteId }: { id: string; clienteId: string }) {
  const [estado, formAction] = useActionState(excluirRegistroHistoricoAction, estadoInicial)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) router.refresh()
  }, [estado, router])

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Excluir este registro de evolução? Esta ação não pode ser desfeita.")) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="empresaId" value={clienteId} />
      <Botao />
    </form>
  )
}
