"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { gerarEvolucaoAutomaticaAction, type EstadoHistorico } from "@/app/(crm)/clientes/historico-actions"

const estadoInicial: EstadoHistorico = { ok: false }

function BotaoInterno() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {pending ? "Analisando tudo..." : "Gerar análise automática"}
    </Button>
  )
}

// Dispara a geração automática do registro de evolução a partir de TODOS os dados
// do cliente. Ao concluir, atualiza a linha do tempo.
export function GerarEvolucaoButton({ clienteId }: { clienteId: string }) {
  const [estado, formAction] = useActionState(gerarEvolucaoAutomaticaAction, estadoInicial)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) router.refresh()
  }, [estado, router])

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="empresaId" value={clienteId} />
      <BotaoInterno />
      {estado.erro && <p className="max-w-xs text-right text-xs text-destructive">{estado.erro}</p>}
    </form>
  )
}
