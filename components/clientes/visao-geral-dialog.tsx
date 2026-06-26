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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { salvarVisaoGeralAction, type EstadoForm } from "@/app/(crm)/clientes/actions"
import type { Meta } from "@/lib/simple-data"

const estadoInicial: EstadoForm = { ok: false }

type MetaEditavel = { rotulo: string; atual: string; alvo: string; unidade: string }

function BotaoSalvar({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}

export function VisaoGeralDialog({
  clienteId,
  resumoEstrategico,
  metas,
  trigger,
}: {
  clienteId: string
  resumoEstrategico: string
  metas: Meta[]
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarVisaoGeralAction, estadoInicial)
  const router = useRouter()

  const [resumo, setResumo] = useState(resumoEstrategico)
  const [linhas, setLinhas] = useState<MetaEditavel[]>(
    metas.map((m) => ({
      rotulo: m.rotulo,
      atual: String(m.atual),
      alvo: String(m.alvo),
      unidade: m.unidade ?? "",
    })),
  )

  // Quando o diálogo abre, recarrega os valores atuais do servidor.
  useEffect(() => {
    if (aberto) {
      setResumo(resumoEstrategico)
      setLinhas(
        metas.map((m) => ({
          rotulo: m.rotulo,
          atual: String(m.atual),
          alvo: String(m.alvo),
          unidade: m.unidade ?? "",
        })),
      )
    }
  }, [aberto, resumoEstrategico, metas])

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  const atualizarLinha = (i: number, campo: keyof MetaEditavel, valor: string) => {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
  }

  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, { rotulo: "", atual: "0", alvo: "0", unidade: "" }])
  }

  const removerLinha = (i: number) => {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const metasJson = JSON.stringify(
    linhas.map((l) => ({
      rotulo: l.rotulo,
      atual: Number(l.atual) || 0,
      alvo: Number(l.alvo) || 0,
      unidade: l.unidade,
    })),
  )

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar visão geral</DialogTitle>
          <DialogDescription>
            Atualize o resumo estratégico e as metas do cliente. As mudanças são salvas no banco da SIMPLE.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-5">
          <input type="hidden" name="id" value={clienteId} />
          <input type="hidden" name="metas" value={metasJson} />

          <div className="grid gap-1.5">
            <Label htmlFor="resumoEstrategico">Resumo estratégico</Label>
            <Textarea
              id="resumoEstrategico"
              name="resumoEstrategico"
              rows={4}
              placeholder="Qual é a estratégia deste cliente?"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Metas</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={adicionarLinha}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar meta
              </Button>
            </div>

            {linhas.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhuma meta. Clique em &quot;Adicionar meta&quot; para criar.
              </p>
            )}

            <div className="grid gap-3">
              {linhas.map((l, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="Rótulo da meta"
                      placeholder="Ex.: Alcance mensal"
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
                      aria-label="Remover meta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-[11px] text-muted-foreground">Atual</Label>
                      <Input
                        inputMode="numeric"
                        value={l.atual}
                        onChange={(e) => atualizarLinha(i, "atual", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px] text-muted-foreground">Alvo</Label>
                      <Input
                        inputMode="numeric"
                        value={l.alvo}
                        onChange={(e) => atualizarLinha(i, "alvo", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px] text-muted-foreground">Unidade</Label>
                      <Input
                        placeholder="% ou vazio"
                        value={l.unidade}
                        onChange={(e) => atualizarLinha(i, "unidade", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar>Salvar visão geral</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
