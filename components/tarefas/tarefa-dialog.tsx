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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { EstadoForm } from "@/app/(crm)/tarefas/actions"
import { PRIORIDADES, STATUS_TAREFA, type Tarefa } from "@/lib/tarefas-types"
import type { Membro } from "@/lib/membros-db"

export type ClienteOpcao = { id: string; nome: string }

const estadoInicial: EstadoForm = { ok: false }

type Acao = (prev: EstadoForm, formData: FormData) => Promise<EstadoForm>

function BotaoSalvar({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}

const selectClasses =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

export function TarefaDialog({
  clientes,
  membros,
  tarefa,
  trigger,
  acao,
  titulo,
  descricao,
  textoBotao,
}: {
  clientes: ClienteOpcao[]
  membros: Membro[]
  tarefa?: Tarefa
  trigger: ReactNode
  acao: Acao
  titulo: string
  descricao: string
  textoBotao: string
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(acao, estadoInicial)
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          {tarefa && <input type="hidden" name="id" value={tarefa.id} />}

          <div className="grid gap-1.5">
            <Label htmlFor="titulo">Tarefa *</Label>
            <Input
              id="titulo"
              name="titulo"
              placeholder="Ex.: Aprovar roteiro do reel institucional"
              defaultValue={tarefa?.titulo}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="descricao">Detalhes</Label>
            <Textarea
              id="descricao"
              name="descricao"
              placeholder="Contexto, checklist, links..."
              rows={3}
              defaultValue={tarefa?.descricao}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="prazo">Prazo</Label>
              <Input id="prazo" name="prazo" type="date" defaultValue={tarefa?.prazo || ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prioridade">Prioridade</Label>
              <select
                id="prioridade"
                name="prioridade"
                defaultValue={tarefa?.prioridade ?? "media"}
                className={selectClasses}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={tarefa?.status ?? "pendente"} className={selectClasses}>
                {STATUS_TAREFA.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="responsavelId">Responsável</Label>
              <select
                id="responsavelId"
                name="responsavelId"
                defaultValue={tarefa?.responsavelId ?? ""}
                className={selectClasses}
              >
                <option value="">Sem responsável</option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="clienteId">Cliente</Label>
            <select id="clienteId" name="clienteId" defaultValue={tarefa?.clienteId ?? ""} className={selectClasses}>
              <option value="">Tarefa interna (sem cliente)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar>{textoBotao}</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
