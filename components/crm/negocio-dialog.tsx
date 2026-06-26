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
import type { EstadoForm } from "@/app/(crm)/crm/actions"
import { ETAPAS_CRM, type Negocio } from "@/lib/crm-types"
import type { Membro } from "@/lib/membros-db"

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

export function NegocioDialog({
  membros,
  negocio,
  etapaInicial,
  trigger,
  acao,
  titulo,
  descricao,
  textoBotao,
}: {
  membros: Membro[]
  negocio?: Negocio
  etapaInicial?: string
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
          {negocio && <input type="hidden" name="id" value={negocio.id} />}

          <div className="grid gap-1.5">
            <Label htmlFor="titulo">Negócio *</Label>
            <Input
              id="titulo"
              name="titulo"
              placeholder="Ex.: Clínica Aurora — gestão de redes"
              defaultValue={negocio?.titulo}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="contato">Contato</Label>
              <Input id="contato" name="contato" placeholder="Pessoa / telefone" defaultValue={negocio?.contato} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="valor">Valor potencial (R$)</Label>
              <Input
                id="valor"
                name="valor"
                inputMode="numeric"
                placeholder="0"
                defaultValue={negocio && negocio.valor > 0 ? negocio.valor : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="etapa">Etapa</Label>
              <select
                id="etapa"
                name="etapa"
                defaultValue={negocio?.etapa ?? etapaInicial ?? "novo"}
                className={selectClasses}
              >
                {ETAPAS_CRM.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="origem">Origem</Label>
              <Input id="origem" name="origem" placeholder="Ex.: Indicação, Instagram" defaultValue={negocio?.origem} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="responsavelId">Responsável</Label>
            <select
              id="responsavelId"
              name="responsavelId"
              defaultValue={negocio?.responsavelId ?? ""}
              className={selectClasses}
            >
              <option value="">Sem responsável</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                  {m.cargo ? ` — ${m.cargo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nota">Anotações</Label>
            <Textarea id="nota" name="nota" placeholder="Contexto da negociação, próximos passos..." rows={3} defaultValue={negocio?.nota} />
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
