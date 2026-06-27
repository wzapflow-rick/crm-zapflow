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
import { salvarEventosAction, type EstadoForm } from "@/app/(crm)/clientes/actions"
import type { EventoCliente } from "@/lib/simple-data"

const estadoInicial: EstadoForm = { ok: false }

const TIPOS: { valor: EventoCliente["tipo"]; label: string }[] = [
  { valor: "gravacao", label: "Gravação" },
  { valor: "post", label: "Post" },
  { valor: "entrega", label: "Entrega" },
  { valor: "reuniao", label: "Reunião" },
]

type EventoEditavel = { id?: string; titulo: string; tipo: string; data: string; hora: string }

function mapearLinhas(eventos: EventoCliente[]): EventoEditavel[] {
  return eventos.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    tipo: e.tipo,
    data: e.dataISO ?? "",
    hora: e.hora ?? "",
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

export function CalendarioDialog({
  clienteId,
  eventos,
  trigger,
}: {
  clienteId: string
  eventos: EventoCliente[]
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarEventosAction, estadoInicial)
  const router = useRouter()

  const [linhas, setLinhas] = useState<EventoEditavel[]>(mapearLinhas(eventos))

  // Quando o diálogo abre, recarrega os valores atuais do servidor.
  useEffect(() => {
    if (aberto) setLinhas(mapearLinhas(eventos))
  }, [aberto, eventos])

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  const atualizarLinha = (i: number, campo: keyof EventoEditavel, valor: string) => {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
  }

  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, { titulo: "", tipo: "gravacao", data: "", hora: "" }])
  }

  const removerLinha = (i: number) => {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const eventosJson = JSON.stringify(
    linhas.map((l) => ({ id: l.id, titulo: l.titulo, tipo: l.tipo, data: l.data, hora: l.hora })),
  )

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar calendário</DialogTitle>
          <DialogDescription>
            Gerencie as gravações, posts, entregas e reuniões do cliente. As mudanças são salvas no banco da SIMPLE.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={clienteId} />
          <input type="hidden" name="eventos" value={eventosJson} />

          <div className="flex items-center justify-between">
            <Label>Eventos</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={adicionarLinha}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar evento
            </Button>
          </div>

          {linhas.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum evento. Clique em &quot;Adicionar evento&quot; para criar.
            </p>
          )}

          <div className="grid gap-3">
            {linhas.map((l, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Título do evento"
                    placeholder="Ex.: Gravação — institucional"
                    value={l.titulo}
                    onChange={(e) => atualizarLinha(i, "titulo", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removerLinha(i)}
                    aria-label="Remover evento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                    <select
                      value={l.tipo}
                      onChange={(e) => atualizarLinha(i, "tipo", e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {TIPOS.map((t) => (
                        <option key={t.valor} value={t.valor}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Data</Label>
                    <Input
                      type="date"
                      value={l.data}
                      onChange={(e) => atualizarLinha(i, "data", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Hora</Label>
                    <Input
                      type="time"
                      value={l.hora}
                      onChange={(e) => atualizarLinha(i, "hora", e.target.value)}
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
            <BotaoSalvar>Salvar calendário</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
