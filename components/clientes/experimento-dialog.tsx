"use client"

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, Sparkles } from "lucide-react"
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
import { criarExperimentoAction, type EstadoExperimento } from "@/app/(crm)/clientes/experimentos-actions"

const estadoInicial: EstadoExperimento = { ok: false }

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="gap-1.5">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {pending ? "Analisando..." : "Salvar experimento"}
    </Button>
  )
}

export function ExperimentoDialog({ clienteId, trigger }: { clienteId: string; trigger: ReactNode }) {
  const [estado, formAction] = useActionState(criarExperimentoAction, estadoInicial)
  const [aberto, setAberto] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      formRef.current?.reset()
    }
  }, [estado.ok])

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo experimento</DialogTitle>
          <DialogDescription>
            Registre uma hipótese e o que foi testado. Se já tiver o resultado, a IA gera a conclusão e o veredito.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="clienteId" value={clienteId} />

          <div className="space-y-1.5">
            <Label htmlFor="hipotese">Hipótese</Label>
            <Textarea
              id="hipotese"
              name="hipotese"
              required
              rows={2}
              placeholder="Ex.: Reels com gancho de pergunta nos 3 primeiros segundos aumentam a retenção."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="oQueFoiTestado">O que foi testado</Label>
            <Textarea
              id="oQueFoiTestado"
              name="oQueFoiTestado"
              rows={2}
              placeholder="Ex.: Publicamos 4 reels com gancho de pergunta durante 2 semanas."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resultado">Resultado observado (opcional)</Label>
            <Textarea
              id="resultado"
              name="resultado"
              rows={3}
              placeholder="Ex.: Retenção média subiu de 28% para 41%, e os salvamentos dobraram. Deixe em branco se ainda está em teste."
            />
          </div>

          {estado.erro && <p className="text-sm text-destructive">{estado.erro}</p>}

          <DialogFooter>
            <BotaoSalvar />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
