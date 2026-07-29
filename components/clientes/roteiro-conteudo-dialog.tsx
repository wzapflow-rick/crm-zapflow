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
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  legenda,
  direcionamento,
  trigger,
}: {
  clienteId: string
  conteudoId: string
  titulo: string
  formato: string
  roteiro: string
  legenda: string
  direcionamento: string
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState(roteiro)
  const [valorLegenda, setValorLegenda] = useState(legenda)
  const [valorDirecionamento, setValorDirecionamento] = useState(direcionamento)
  const [estado, formAction] = useActionState(salvarRoteiroConteudoAction, estadoInicial)
  const router = useRouter()

  // Recarrega o roteiro, a legenda e o direcionamento atuais sempre que o diálogo abre.
  useEffect(() => {
    if (aberto) {
      setValor(roteiro)
      setValorLegenda(legenda)
      setValorDirecionamento(direcionamento)
    }
  }, [aberto, roteiro, legenda, direcionamento])

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
            Roteiro do conteúdo ({formato}). Detalhe falas, cenas, CTA e cortes, e sugira uma legenda para a publicação.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="conteudoId" value={conteudoId} />

          <div className="grid gap-1.5">
            <Label htmlFor="roteiro">Roteiro</Label>
            <Textarea
              id="roteiro"
              name="roteiro"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              rows={10}
              placeholder="Escreva o roteiro do conteúdo aqui..."
              className="field-sizing-fixed resize-y"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="legenda">Sugestão de legenda</Label>
            <Textarea
              id="legenda"
              name="legenda"
              value={valorLegenda}
              onChange={(e) => setValorLegenda(e.target.value)}
              rows={5}
              placeholder="Escreva a sugestão de legenda para a publicação..."
              className="field-sizing-fixed resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Texto sugerido para acompanhar a publicação (chamada, hashtags, CTA).
            </p>
          </div>

          <div className="grid gap-1.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <Label htmlFor="direcionamento" className="text-amber-600 dark:text-amber-400">
                Direcionamento interno
              </Label>
            </div>
            <Textarea
              id="direcionamento"
              name="direcionamento"
              value={valorDirecionamento}
              onChange={(e) => setValorDirecionamento(e.target.value)}
              rows={5}
              placeholder="Orientações de filmagem para o videomaker e de aparência visual para o design gráfico..."
              className="field-sizing-fixed resize-y bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Visível somente para a equipe. Nunca aparece no portal do cliente.
            </p>
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
