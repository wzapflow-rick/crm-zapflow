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
import { salvarRegistroHistoricoAction, type EstadoHistorico } from "@/app/(crm)/clientes/historico-actions"

const estadoInicial: EstadoHistorico = { ok: false }

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="gap-1.5">
      <Sparkles className="h-4 w-4" />
      {pending ? "Organizando com a IA..." : "Organizar e salvar"}
    </Button>
  )
}

export function HistoricoDialog({ clienteId, trigger }: { clienteId: string; trigger: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarRegistroHistoricoAction, estadoInicial)
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
          <DialogTitle>Novo registro de evolução</DialogTitle>
          <DialogDescription>
            Escreva livremente como foi o período (números, o que melhorou, problemas resolvidos e novos desafios). A
            IA SIMPLE OS organiza tudo e salva. Visível apenas para a equipe.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="empresaId" value={clienteId} />

          <div className="grid gap-1.5">
            <Label htmlFor="periodo">Período</Label>
            <Input id="periodo" name="periodo" placeholder="Ex.: Mês 1, Janeiro 2026" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notas">O que aconteceu neste período?</Label>
            <Textarea
              id="notas"
              name="notas"
              rows={8}
              placeholder={
                "Escreva solto. Ex.: Começamos com 10 seguidores e 10k de views. Tínhamos problema de identidade visual e pouca constância. Resolvemos a constância (4 posts/semana) e melhoramos a bio. Ainda falta CTA nos reels e o engajamento está baixo. Próximo passo: criar série de bastidores."
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
