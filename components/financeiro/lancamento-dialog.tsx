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
import { cn } from "@/lib/utils"
import type { EstadoForm } from "@/app/(crm)/financeiro/actions"
import {
  CATEGORIAS_CUSTO,
  CATEGORIAS_RECEITA,
  TIPOS_LANCAMENTO,
  type Lancamento,
  type TipoLancamento,
} from "@/lib/financeiro-types"

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

export function LancamentoDialog({
  clientes,
  mes,
  lancamento,
  trigger,
  acao,
  titulo,
  descricao,
  textoBotao,
}: {
  clientes: ClienteOpcao[]
  mes: string
  lancamento?: Lancamento
  trigger: ReactNode
  acao: Acao
  titulo: string
  descricao: string
  textoBotao: string
}) {
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(acao, estadoInicial)
  const router = useRouter()

  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? "custo")
  const [recorrente, setRecorrente] = useState<boolean>(lancamento?.recorrente ?? false)

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  // Ao abrir, sincroniza o estado local com o lançamento em edição
  useEffect(() => {
    if (aberto) {
      setTipo(lancamento?.tipo ?? "custo")
      setRecorrente(lancamento?.recorrente ?? false)
    }
  }, [aberto, lancamento])

  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_CUSTO

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          {lancamento && <input type="hidden" name="id" value={lancamento.id} />}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoLancamento)}
                className={selectClasses}
              >
                {TIPOS_LANCAMENTO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                name="valor"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={lancamento ? String(lancamento.valor).replace(".", ",") : ""}
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              name="descricao"
              placeholder={tipo === "receita" ? "Ex.: Projeto de branding" : "Ex.: Assinatura de ferramentas"}
              defaultValue={lancamento?.descricao}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <select id="categoria" name="categoria" defaultValue={lancamento?.categoria ?? ""} className={selectClasses}>
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="empresaId">Cliente</Label>
              <select id="empresaId" name="empresaId" defaultValue={lancamento?.empresaId ?? ""} className={selectClasses}>
                <option value="">Sem cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <input
              type="checkbox"
              name="recorrente"
              checked={recorrente}
              onChange={(e) => setRecorrente(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-foreground">Recorrente (repete todo mês)</span>
          </label>

          {!recorrente && (
            <div className="grid gap-1.5">
              <Label htmlFor="competencia">Mês de competência</Label>
              <Input id="competencia" name="competencia" type="month" defaultValue={lancamento?.competencia ?? mes} />
            </div>
          )}

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
