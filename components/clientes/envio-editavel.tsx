"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { ExternalLink, LinkIcon, Loader2, Pencil, Trash2 } from "lucide-react"
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
import {
  atualizarEnvioAction,
  excluirEnvioAction,
  type EstadoEnvio,
} from "@/app/(crm)/clientes/envios-actions"
import type { EnvioCliente } from "@/lib/envios-db"

const estadoInicial: EstadoEnvio = { ok: false }

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar alterações"}
    </Button>
  )
}

// Item de "Enviado pelo cliente" com ações da equipe: renomear, substituir o link ou excluir.
export function EnvioEditavel({ envio, clienteId }: { envio: EnvioCliente; clienteId: string }) {
  const [aberto, setAberto] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, iniciarExclusao] = useTransition()
  const [estado, formAction] = useActionState(atualizarEnvioAction, estadoInicial)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <LinkIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{envio.titulo}</p>
        <p className="truncate text-xs text-muted-foreground">
          {envio.descricao ||
            new Date(envio.criadoEm).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <a
          href={envio.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>

        {/* Editar (renomear / substituir link) */}
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Editar ${envio.titulo}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar material enviado</DialogTitle>
              <DialogDescription>
                Renomeie, ajuste a observação ou substitua o link enviado pelo cliente.
              </DialogDescription>
            </DialogHeader>

            <form action={formAction} className="grid gap-4">
              <input type="hidden" name="id" value={envio.id} />
              <input type="hidden" name="clienteId" value={clienteId} />

              <div className="grid gap-1.5">
                <Label htmlFor={`titulo-${envio.id}`}>Título</Label>
                <Input
                  id={`titulo-${envio.id}`}
                  name="titulo"
                  defaultValue={envio.titulo}
                  placeholder="Ex.: Bastidores da gravação"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor={`link-${envio.id}`}>Link</Label>
                <Input
                  id={`link-${envio.id}`}
                  name="link"
                  type="url"
                  inputMode="url"
                  required
                  defaultValue={envio.link}
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor={`descricao-${envio.id}`}>Observação (opcional)</Label>
                <Textarea
                  id={`descricao-${envio.id}`}
                  name="descricao"
                  rows={2}
                  defaultValue={envio.descricao}
                  placeholder="Observações sobre o material"
                />
              </div>

              {estado.erro && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{estado.erro}</p>
              )}

              <DialogFooter>
                <BotaoSalvar />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Excluir (com confirmação) */}
        {confirmarExclusao ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="destructive"
              className="h-8 px-2.5 text-xs"
              disabled={excluindo}
              onClick={() =>
                iniciarExclusao(async () => {
                  await excluirEnvioAction(envio.id, clienteId)
                  router.refresh()
                })
              }
            >
              {excluindo ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-xs"
              onClick={() => setConfirmarExclusao(false)}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmarExclusao(true)}
            aria-label={`Excluir ${envio.titulo}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  )
}
