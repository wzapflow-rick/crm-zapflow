"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { criarClienteAction, type EstadoForm } from "@/app/(crm)/clientes/actions"

const estadoInicial: EstadoForm = { ok: false }

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar cliente"}
    </Button>
  )
}

export function NovoClienteDialog() {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(criarClienteAction, estadoInicial)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      formRef.current?.reset()
      router.refresh()
    }
  }, [estado, router])

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Cadastre um cliente. Ele será salvo no banco de dados da SIMPLE.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" placeholder="Ex.: Clínica Aurora" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="segmento">Segmento</Label>
              <Input id="segmento" name="segmento" placeholder="Ex.: Saúde" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue="onboarding">
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="objetivo">Objetivo</Label>
            <Textarea
              id="objetivo"
              name="objetivo"
              placeholder="O que esse cliente quer alcançar com a SIMPLE?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="contato">Contato</Label>
              <Input id="contato" name="contato" placeholder="Nome do responsável" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" placeholder="(11) 90000-0000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="mrr">Receita mensal (R$)</Label>
              <Input id="mrr" name="mrr" inputMode="numeric" placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="desde">Cliente desde</Label>
              <Input id="desde" name="desde" type="date" />
            </div>
          </div>

          {estado.erro && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {estado.erro}
            </p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
