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
import type { EstadoForm } from "@/app/(crm)/calendario/actions"
import { TIPOS_EVENTO, type Evento } from "@/lib/eventos-types"
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

export function EventoDialog({
  clientes,
  membros,
  evento,
  dataPadrao,
  trigger,
  acao,
  titulo,
  descricao,
  textoBotao,
  open,
  onOpenChange,
}: {
  clientes: ClienteOpcao[]
  membros: Membro[]
  evento?: Evento
  dataPadrao?: string
  trigger?: ReactNode
  acao: Acao
  titulo: string
  descricao: string
  textoBotao: string
  open?: boolean
  onOpenChange?: (v: boolean) => void
}) {
  const [abertoInterno, setAbertoInterno] = useState(false)
  const controlado = open !== undefined
  const aberto = controlado ? open : abertoInterno
  const setAberto = controlado ? (onOpenChange ?? (() => {})) : setAbertoInterno

  const [estado, formAction] = useActionState(acao, estadoInicial)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, router])

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          {evento && <input type="hidden" name="id" value={evento.id} />}

          <div className="grid gap-1.5">
            <Label htmlFor="titulo">Compromisso *</Label>
            <Input
              id="titulo"
              name="titulo"
              placeholder="Ex.: Gravação do reel institucional"
              defaultValue={evento?.titulo}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="descricao">Detalhes</Label>
            <Textarea
              id="descricao"
              name="descricao"
              placeholder="Local, pauta, links..."
              rows={2}
              defaultValue={evento?.descricao}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="data">Data *</Label>
              <Input id="data" name="data" type="date" defaultValue={evento?.data || dataPadrao || ""} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" name="hora" type="time" defaultValue={evento?.hora || ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select id="tipo" name="tipo" defaultValue={evento?.tipo ?? "reuniao"} className={selectClasses}>
                {TIPOS_EVENTO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="responsavelId">Responsável</Label>
              <select
                id="responsavelId"
                name="responsavelId"
                defaultValue={evento?.responsavelId ?? ""}
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
            <select id="clienteId" name="clienteId" defaultValue={evento?.clienteId ?? ""} className={selectClasses}>
              <option value="">Interno (sem cliente)</option>
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
