"use client"

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Membro } from "@/lib/membros-db"
import {
  salvarMembroAction,
  excluirMembroAction,
  type EstadoEquipe,
} from "@/app/(crm)/configuracoes/actions"

const estadoInicial: EstadoEquipe = { ok: false }

function BotaoSalvar({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}

function MembroDialog({ membro, trigger }: { membro?: Membro; trigger: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarMembroAction, estadoInicial)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{membro ? "Editar membro" : "Novo membro"}</DialogTitle>
          <DialogDescription>
            {membro
              ? "Atualize os dados deste membro da equipe."
              : "Cadastre um novo membro da equipe da SIMPLE."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          {membro && <input type="hidden" name="id" value={membro.id} />}

          <div className="grid gap-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" placeholder="Ex.: Lais Andrade" defaultValue={membro?.nome} required />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="cargo">Cargo / função</Label>
            <Input id="cargo" name="cargo" placeholder="Ex.: Social Media" defaultValue={membro?.cargo} />
          </div>

          {estado.erro && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar>{membro ? "Salvar alterações" : "Adicionar membro"}</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BotaoExcluir({ membro }: { membro: Membro }) {
  const [estado, formAction] = useActionState(excluirMembroAction, estadoInicial)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) router.refresh()
  }, [estado, router])

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Remover ${membro.nome} da equipe?`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={membro.id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label={`Remover ${membro.nome}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  )
}

export function Equipe({ membros }: { membros: Membro[] }) {
  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Equipe</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Membros da SIMPLE que podem ser responsáveis por clientes e autores de mensagens.
            </p>
          </div>
          <MembroDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo membro
              </Button>
            }
          />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card">
          {membros.length > 0 ? (
            <ul className="divide-y divide-border">
              {membros.map((m) => (
                <li key={m.id} className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={cn(m.cor, "text-sm text-primary-foreground")}>
                      {m.iniciais}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{m.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.cargo || "Sem cargo definido"}</p>
                  </div>
                  <MembroDialog
                    membro={m}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`Editar ${m.nome}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <BotaoExcluir membro={m} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhum membro cadastrado ainda. Clique em &quot;Novo membro&quot; para começar.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
