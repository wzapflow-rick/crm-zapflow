"use client"

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react"
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
import type { EstadoForm } from "@/app/(crm)/clientes/actions"
import type { Cliente } from "@/lib/simple-data"
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

// <select> nativo estilizado — confiável dentro de modais (sempre abre, funciona no mobile).
const selectClasses =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

export function ClienteFormDialog({
  membros,
  cliente,
  trigger,
  acao,
  titulo,
  descricao,
  textoBotao,
}: {
  membros: Membro[]
  cliente?: Cliente
  trigger: ReactNode
  acao: Acao
  titulo: string
  descricao: string
  textoBotao: string
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(acao, estadoInicial)
  const formRef = useRef<HTMLFormElement>(null)
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

        <form ref={formRef} action={formAction} className="grid gap-4">
          {cliente && <input type="hidden" name="id" value={cliente.id} />}

          <div className="grid gap-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" placeholder="Ex.: Clínica Aurora" defaultValue={cliente?.nome} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="segmento">Segmento</Label>
              <Input id="segmento" name="segmento" placeholder="Ex.: Saúde" defaultValue={cliente?.segmento === "—" ? "" : cliente?.segmento} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={cliente?.status ?? "onboarding"} className={selectClasses}>
                <option value="onboarding">Onboarding</option>
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="responsavelId">Responsável</Label>
            <select id="responsavelId" name="responsavelId" defaultValue={cliente?.responsavelId ?? ""} className={selectClasses}>
              <option value="">Sem responsável</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                  {m.cargo ? ` — ${m.cargo}` : ""}
                </option>
              ))}
            </select>
            {membros.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum membro cadastrado ainda. Adicione membros na tabela do banco para vinculá-los.
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="objetivo">Objetivo</Label>
            <Textarea
              id="objetivo"
              name="objetivo"
              placeholder="O que esse cliente quer alcançar com a SIMPLE?"
              rows={3}
              defaultValue={cliente?.objetivo}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="contato">Contato</Label>
              <Input id="contato" name="contato" placeholder="Nome do responsável" defaultValue={cliente?.contato} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" placeholder="(11) 90000-0000" defaultValue={cliente?.telefone} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="mrr">Valor (R$)</Label>
              <Input id="mrr" name="mrr" inputMode="numeric" placeholder="0" defaultValue={cliente && cliente.mrr > 0 ? cliente.mrr : ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="desde">Cliente desde</Label>
              <Input id="desde" name="desde" type="date" defaultValue={cliente?.desdeISO} />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input bg-muted/30 px-3 py-2.5 transition-colors has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5">
            <input
              type="checkbox"
              name="recorrente"
              defaultChecked={cliente?.recorrente ?? true}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium text-foreground">Receita recorrente (mensal)</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                Desmarque para clientes avulsos — quem contratou um serviço pontual (ex.: cobertura de
                evento) e não tem mensalidade. Avulsos não entram na receita recorrente.
              </span>
            </span>
          </label>

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
