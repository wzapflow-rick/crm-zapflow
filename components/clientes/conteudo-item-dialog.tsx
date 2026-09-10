"use client"

import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
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
import {
  criarConteudoAction,
  atualizarDadosConteudoAction,
  excluirConteudoAction,
  type EstadoForm,
} from "@/app/(crm)/clientes/actions"
import type { ConteudoItem, StatusConteudo } from "@/lib/simple-data"

const estadoInicial: EstadoForm = { ok: false }

const FORMATOS: ConteudoItem["formato"][] = ["Reels", "Carrossel", "Story", "Vídeo", "Estático"]

const STATUS: { valor: StatusConteudo; label: string }[] = [
  { valor: "ideia", label: "Ideia" },
  { valor: "roteiro", label: "Roteiro" },
  { valor: "gravacao", label: "Gravação" },
  { valor: "edicao", label: "Edição" },
  { valor: "aprovacao", label: "Aprovação" },
  { valor: "aprovado", label: "Aprovado" },
  { valor: "publicado", label: "Publicado" },
]

function BotaoSalvar({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}

// Campos básicos compartilhados entre criar e editar.
function CamposConteudo({
  titulo,
  formato,
  status,
  data,
}: {
  titulo: string
  formato: string
  status: string
  data: string
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="titulo-conteudo">Título</Label>
        <Input
          id="titulo-conteudo"
          name="titulo"
          defaultValue={titulo}
          placeholder="Ex.: Mitos e verdades sobre..."
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="grid gap-1">
          <Label className="text-[11px] text-muted-foreground">Formato</Label>
          <select
            name="formato"
            defaultValue={formato}
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
            name="status"
            defaultValue={status}
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
          <Input type="date" name="data" defaultValue={data} />
        </div>
      </div>
    </>
  )
}

// Diálogo para criar um novo conteúdo (acrescenta ao pipeline).
export function CriarConteudoDialog({ clienteId, trigger }: { clienteId: string; trigger: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(criarConteudoAction, estadoInicial)
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar conteúdo</DialogTitle>
          <DialogDescription>
            Adicione uma nova peça ao pipeline editorial. Roteiro, legenda e links você preenche depois clicando no
            título do conteúdo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={clienteId} />
          <CamposConteudo titulo="" formato="Reels" status="ideia" data="" />
          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}
          <DialogFooter className="mt-1">
            <BotaoSalvar>Criar conteúdo</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Diálogo para editar os dados básicos de um conteúdo já existente + excluir.
export function EditarConteudoDialog({
  clienteId,
  conteudo,
  trigger,
}: {
  clienteId: string
  conteudo: ConteudoItem
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(atualizarDadosConteudoAction, estadoInicial)
  const [excluindo, iniciarExclusao] = useTransition()
  const [erroExcluir, setErroExcluir] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  const excluir = () => {
    if (!confirm(`Excluir o conteúdo "${conteudo.titulo}"? Esta ação não pode ser desfeita.`)) return
    setErroExcluir("")
    iniciarExclusao(async () => {
      const res = await excluirConteudoAction(clienteId, conteudo.id)
      if (res.ok) {
        setAberto(false)
        router.refresh()
      } else {
        setErroExcluir(res.erro ?? "Não foi possível excluir.")
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar conteúdo</DialogTitle>
          <DialogDescription>
            Ajuste título, formato, status e data. Para editar roteiro, legenda e links, clique no título do conteúdo
            na lista.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="conteudoId" value={conteudo.id} />
          <CamposConteudo
            titulo={conteudo.titulo}
            formato={conteudo.formato}
            status={conteudo.status}
            data={conteudo.dataISO ?? ""}
          />
          {(estado.erro || erroExcluir) && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>
              {estado.erro || erroExcluir}
            </p>
          )}
          <DialogFooter className="mt-1 flex-row items-center justify-between gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={excluir}
              disabled={excluindo}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {excluindo ? "Excluindo..." : "Excluir"}
            </Button>
            <BotaoSalvar>Salvar</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
