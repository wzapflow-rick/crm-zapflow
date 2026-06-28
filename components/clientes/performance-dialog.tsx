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
import { salvarPerformanceAction, type EstadoPerformance } from "@/app/(crm)/clientes/performance-actions"
import { FORMATOS_PERFORMANCE } from "@/lib/performance-formatos"

const estadoInicial: EstadoPerformance = { ok: false }

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="gap-1.5">
      <Sparkles className="h-4 w-4" />
      {pending ? "Analisando com a IA..." : "Salvar e analisar"}
    </Button>
  )
}

export function PerformanceDialog({ clienteId, trigger }: { clienteId: string; trigger: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarPerformanceAction, estadoInicial)
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
          <DialogTitle>Novo conteúdo publicado</DialogTitle>
          <DialogDescription>
            Registre um conteúdo e suas métricas. A IA SIMPLE OS gera aprendizados estratégicos e guarda tudo na memória
            do cliente para usar no chat e nas próximas estratégias.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="empresaId" value={clienteId} />

          <div className="grid gap-1.5">
            <Label htmlFor="titulo">Título / descrição do conteúdo</Label>
            <Input id="titulo" name="titulo" placeholder="Ex.: Reel de bastidores da gravação" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="formato">Formato</Label>
              <select
                id="formato"
                name="formato"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="Reels"
              >
                {FORMATOS_PERFORMANCE.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="data">Data de publicação</Label>
              <Input id="data" name="data" type="date" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="gancho">Gancho (primeiros segundos / chamada)</Label>
            <Input id="gancho" name="gancho" placeholder="Ex.: 'O erro que toda clínica comete no Instagram'" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="objetivo">Objetivo do conteúdo</Label>
            <Input id="objetivo" name="objetivo" placeholder="Ex.: Gerar autoridade e agendamentos" />
          </div>

          <fieldset className="grid grid-cols-3 gap-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs text-muted-foreground">Métricas (opcionais)</legend>
            <Campo id="views" label="Views" />
            <Campo id="alcance" label="Alcance" />
            <Campo id="curtidas" label="Curtidas" />
            <Campo id="comentarios" label="Comentários" />
            <Campo id="salvamentos" label="Salvamentos" />
            <Campo id="compartilhamentos" label="Compart." />
          </fieldset>

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

function Campo({ id, label }: { id: string; label: string }) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} name={id} inputMode="numeric" placeholder="0" className="h-8" />
    </div>
  )
}
