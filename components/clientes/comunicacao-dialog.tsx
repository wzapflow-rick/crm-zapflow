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
import { salvarMensagensAction, type EstadoForm } from "@/app/(crm)/clientes/actions"
import type { Mensagem } from "@/lib/simple-data"
import type { Membro } from "@/lib/membros-db"

const estadoInicial: EstadoForm = { ok: false }

type MensagemEditavel = { autorId: string; texto: string; data: string }

function mapearLinhas(mensagens: Mensagem[]): MensagemEditavel[] {
  return mensagens.map((m) => ({ autorId: m.autorId ?? "", texto: m.texto, data: m.data ?? "" }))
}

function BotaoSalvar({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}

export function ComunicacaoDialog({
  clienteId,
  mensagens,
  membros,
  trigger,
}: {
  clienteId: string
  mensagens: Mensagem[]
  membros: Membro[]
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarMensagensAction, estadoInicial)
  const router = useRouter()

  const [linhas, setLinhas] = useState<MensagemEditavel[]>(mapearLinhas(mensagens))

  useEffect(() => {
    if (aberto) setLinhas(mapearLinhas(mensagens))
  }, [aberto, mensagens])

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  const atualizarLinha = (i: number, campo: keyof MensagemEditavel, valor: string) => {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
  }

  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, { autorId: membros[0]?.id ?? "", texto: "", data: "" }])
  }

  const removerLinha = (i: number) => {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const mensagensJson = JSON.stringify(
    linhas.map((l) => ({ autorId: l.autorId, texto: l.texto, data: l.data })),
  )

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar comunicação</DialogTitle>
          <DialogDescription>
            Registre os alinhamentos e mensagens trocadas com o cliente. As mudanças são salvas no banco da SIMPLE.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={clienteId} />
          <input type="hidden" name="mensagens" value={mensagensJson} />

          <div className="flex items-center justify-between">
            <Label>Mensagens</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={adicionarLinha}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar mensagem
            </Button>
          </div>

          {linhas.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhuma mensagem. Clique em &quot;Adicionar mensagem&quot; para registrar.
            </p>
          )}

          <div className="grid gap-3">
            {linhas.map((l, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Autor</Label>
                    <select
                      value={l.autorId}
                      onChange={(e) => atualizarLinha(i, "autorId", e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Sem autor</option>
                      {membros.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Quando</Label>
                    <Input
                      placeholder="Ex.: Hoje, 09:12"
                      value={l.data}
                      onChange={(e) => atualizarLinha(i, "data", e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <Textarea
                    aria-label="Mensagem"
                    placeholder="O que foi alinhado com o cliente?"
                    value={l.texto}
                    onChange={(e) => atualizarLinha(i, "texto", e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removerLinha(i)}
                    aria-label="Remover mensagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar>Salvar comunicação</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
