"use client"

import { useActionState, useEffect, useState, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { salvarResultadosAction, type EstadoForm } from "@/app/(crm)/clientes/actions"
import type { MetricaResultado } from "@/lib/simple-data"

const estadoInicial: EstadoForm = { ok: false }

type ResultadoEditavel = { rotulo: string; valor: string; variacao: string }

function mapearLinhas(resultados: MetricaResultado[]): ResultadoEditavel[] {
  return resultados.map((r) => ({
    rotulo: r.rotulo,
    valor: r.valor,
    variacao: String(r.variacao),
  }))
}

function BotaoSalvar({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}

export function ResultadosDialog({
  clienteId,
  resultados,
  trigger,
}: {
  clienteId: string
  resultados: MetricaResultado[]
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarResultadosAction, estadoInicial)
  const router = useRouter()

  const [linhas, setLinhas] = useState<ResultadoEditavel[]>(mapearLinhas(resultados))

  useEffect(() => {
    if (aberto) setLinhas(mapearLinhas(resultados))
  }, [aberto, resultados])

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  const atualizarLinha = (i: number, campo: keyof ResultadoEditavel, valor: string) => {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
  }

  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, { rotulo: "", valor: "", variacao: "0" }])
  }

  const removerLinha = (i: number) => {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const resultadosJson = JSON.stringify(
    linhas.map((l) => ({ rotulo: l.rotulo, valor: l.valor, variacao: Number(l.variacao) || 0 })),
  )

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar resultados</DialogTitle>
          <DialogDescription>
            Registre as métricas de desempenho do cliente. A variação é o percentual comparado ao mês anterior (use
            valores negativos para queda).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={clienteId} />
          <input type="hidden" name="resultados" value={resultadosJson} />

          <div className="flex items-center justify-between">
            <Label>Métricas</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={adicionarLinha}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar métrica
            </Button>
          </div>

          {linhas.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhuma métrica. Clique em &quot;Adicionar métrica&quot; para criar.
            </p>
          )}

          <div className="grid gap-3">
            {linhas.map((l, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Rótulo da métrica"
                    placeholder="Ex.: Alcance, Seguidores, Engajamento"
                    value={l.rotulo}
                    onChange={(e) => atualizarLinha(i, "rotulo", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removerLinha(i)}
                    aria-label="Remover métrica"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Valor</Label>
                    <Input
                      placeholder="Ex.: 12.5k"
                      value={l.valor}
                      onChange={(e) => atualizarLinha(i, "valor", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Variação (%)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="Ex.: 12 ou -5"
                      value={l.variacao}
                      onChange={(e) => atualizarLinha(i, "variacao", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar>Salvar resultados</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
