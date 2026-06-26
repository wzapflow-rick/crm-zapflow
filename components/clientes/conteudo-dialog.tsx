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
import { salvarConteudosAction, type EstadoForm } from "@/app/(crm)/clientes/actions"
import type { ConteudoItem, StatusConteudo } from "@/lib/simple-data"

const estadoInicial: EstadoForm = { ok: false }

const FORMATOS: ConteudoItem["formato"][] = ["Reels", "Carrossel", "Story", "Vídeo", "Estático"]

const STATUS: { valor: StatusConteudo; label: string }[] = [
  { valor: "ideia", label: "Ideia" },
  { valor: "roteiro", label: "Roteiro" },
  { valor: "gravacao", label: "Gravação" },
  { valor: "edicao", label: "Edição" },
  { valor: "aprovacao", label: "Aprovação" },
  { valor: "publicado", label: "Publicado" },
]

type ConteudoEditavel = { titulo: string; formato: string; status: string; data: string }

function mapearLinhas(conteudos: ConteudoItem[]): ConteudoEditavel[] {
  return conteudos.map((c) => ({
    titulo: c.titulo,
    formato: c.formato,
    status: c.status,
    data: c.dataISO ?? "",
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

export function ConteudoDialog({
  clienteId,
  conteudos,
  trigger,
}: {
  clienteId: string
  conteudos: ConteudoItem[]
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarConteudosAction, estadoInicial)
  const router = useRouter()

  const [linhas, setLinhas] = useState<ConteudoEditavel[]>(mapearLinhas(conteudos))

  // Quando o diálogo abre, recarrega os valores atuais do servidor.
  useEffect(() => {
    if (aberto) setLinhas(mapearLinhas(conteudos))
  }, [aberto, conteudos])

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  const atualizarLinha = (i: number, campo: keyof ConteudoEditavel, valor: string) => {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
  }

  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, { titulo: "", formato: "Reels", status: "ideia", data: "" }])
  }

  const removerLinha = (i: number) => {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const conteudosJson = JSON.stringify(
    linhas.map((l) => ({ titulo: l.titulo, formato: l.formato, status: l.status, data: l.data })),
  )

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar conteúdo</DialogTitle>
          <DialogDescription>
            Gerencie o pipeline editorial do cliente: ideias, roteiros, gravações e publicações. As mudanças são salvas no banco da SIMPLE.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={clienteId} />
          <input type="hidden" name="conteudos" value={conteudosJson} />

          <div className="flex items-center justify-between">
            <Label>Conteúdos</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={adicionarLinha}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar conteúdo
            </Button>
          </div>

          {linhas.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum conteúdo. Clique em &quot;Adicionar conteúdo&quot; para criar.
            </p>
          )}

          <div className="grid gap-3">
            {linhas.map((l, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Título do conteúdo"
                    placeholder="Ex.: Mitos e verdades sobre..."
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
                    aria-label="Remover conteúdo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Formato</Label>
                    <select
                      value={l.formato}
                      onChange={(e) => atualizarLinha(i, "formato", e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {FORMATOS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Status</Label>
                    <select
                      value={l.status}
                      onChange={(e) => atualizarLinha(i, "status", e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {STATUS.map((s) => (
                        <option key={s.valor} value={s.valor}>
                          {s.label}
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
                </div>
              </div>
            ))}
          </div>

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar>Salvar conteúdo</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
