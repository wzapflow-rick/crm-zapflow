"use client"

import { useState, useTransition } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { excluirEstrategiaMensalAction } from "@/app/(crm)/clientes/estrategia-mensal-actions"

export function ExcluirEstrategiaMensalButton({
  id,
  clienteId,
  rotulo,
}: {
  id: string
  clienteId: string
  rotulo: string
}) {
  const [confirmar, setConfirmar] = useState(false)
  const [pending, startTransition] = useTransition()

  if (confirmar) {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="destructive"
          className="h-8 px-2.5 text-xs"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void excluirEstrategiaMensalAction(id, clienteId)
            })
          }
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => setConfirmar(false)}>
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={() => setConfirmar(true)}
      aria-label={`Excluir estratégia de ${rotulo}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
