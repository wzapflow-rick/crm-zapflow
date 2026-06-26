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
import { salvarArquivosAction, type EstadoForm } from "@/app/(crm)/clientes/actions"
import type { Arquivo } from "@/lib/simple-data"

const estadoInicial: EstadoForm = { ok: false }

const TIPOS: Arquivo["tipo"][] = ["Material", "Branding", "Drive", "Contrato"]

type ArquivoEditavel = { nome: string; tipo: string; url: string }

function mapearLinhas(arquivos: Arquivo[]): ArquivoEditavel[] {
  return arquivos.map((a) => ({ nome: a.nome, tipo: a.tipo, url: a.url ?? "" }))
}

function BotaoSalvar({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}

export function ArquivosDialog({
  clienteId,
  arquivos,
  trigger,
}: {
  clienteId: string
  arquivos: Arquivo[]
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(salvarArquivosAction, estadoInicial)
  const router = useRouter()

  const [linhas, setLinhas] = useState<ArquivoEditavel[]>(mapearLinhas(arquivos))

  useEffect(() => {
    if (aberto) setLinhas(mapearLinhas(arquivos))
  }, [aberto, arquivos])

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  const atualizarLinha = (i: number, campo: keyof ArquivoEditavel, valor: string) => {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))
  }

  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, { nome: "", tipo: "Material", url: "" }])
  }

  const removerLinha = (i: number) => {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const arquivosJson = JSON.stringify(linhas.map((l) => ({ nome: l.nome, tipo: l.tipo, url: l.url })))

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar arquivos</DialogTitle>
          <DialogDescription>
            Cole o link do material (Google Drive, Dropbox, YouTube, WeTransfer...). O cliente clica e baixa/abre direto. Nada é hospedado aqui.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={clienteId} />
          <input type="hidden" name="arquivos" value={arquivosJson} />

          <div className="flex items-center justify-between">
            <Label>Arquivos</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={adicionarLinha}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar arquivo
            </Button>
          </div>

          {linhas.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum arquivo. Clique em &quot;Adicionar arquivo&quot; para criar.
            </p>
          )}

          <div className="grid gap-3">
            {linhas.map((l, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Nome do arquivo"
                    placeholder="Ex.: Vídeo institucional final"
                    value={l.nome}
                    onChange={(e) => atualizarLinha(i, "nome", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removerLinha(i)}
                    aria-label="Remover arquivo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 grid gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Link (Drive, YouTube, Dropbox...)</Label>
                    <Input
                      type="url"
                      inputMode="url"
                      placeholder="https://drive.google.com/..."
                      value={l.url}
                      onChange={(e) => atualizarLinha(i, "url", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                    <select
                      value={l.tipo}
                      onChange={(e) => atualizarLinha(i, "tipo", e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {TIPOS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar>Salvar arquivos</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
