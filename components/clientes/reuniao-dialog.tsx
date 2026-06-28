"use client"

import { useActionState, useEffect, useState, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { salvarReuniaoAction, type EstadoReuniao } from "@/app/(crm)/clientes/reunioes-actions"

const estadoInicial: EstadoReuniao = { ok: false }

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="gap-1.5">
      <Sparkles className="h-4 w-4" />
      {pending ? "Organizando com a IA..." : "Organizar e salvar"}
    </Button>
  )
}

export function ReuniaoDialog({ clienteId, trigger }: { clienteId: string; trigger: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarReuniaoAction, estadoInicial)
  const router = useRouter()

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
          <DialogTitle>Nova reunião</DialogTitle>
          <DialogDescription>
            Cole ou escreva livremente as anotações da reunião. A IA SIMPLE OS organiza em resumo, decisões, problemas,
            próximas ações e insights — e guarda na memória do cliente. Visível apenas para a equipe.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="empresaId" value={clienteId} />

          <div className="grid gap-1.5">
            <Label htmlFor="data">Data da reunião</Label>
            <Input id="data" name="data" type="date" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notas">Anotações da reunião</Label>
            <Textarea
              id="notas"
              name="notas"
              rows={9}
              placeholder={
                "Escreva solto. Ex.: Reunião de alinhamento mensal. Cliente reclamou que os reels não estão convertendo em agendamentos. Decidimos focar em conteúdo de prova social e depoimentos. Ana vai produzir 4 reels de bastidores até dia 20. Insight: o público responde melhor a vídeos com o rosto da fundadora."
              }
            />
          </div>

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
