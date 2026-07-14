"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Check, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { salvarMemoriaAction, type EstadoMemoria } from "@/app/(crm)/clientes/memoria-actions"
import type { SecaoMemoria } from "@/lib/memoria-secoes"

const estadoInicial: EstadoMemoria = { ok: false }

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" className="gap-1.5" disabled={pending}>
      <Check className="h-3.5 w-3.5" />
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  )
}

export function MemoriaSecao({
  clienteId,
  secao,
  valor,
}: {
  clienteId: string
  secao: SecaoMemoria
  valor: string
}) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(valor)
  const [estado, formAction] = useActionState(salvarMemoriaAction, estadoInicial)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) {
      setEditando(false)
      router.refresh()
    }
  }, [estado, router])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{secao.titulo}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{secao.descricao}</p>
        </div>
        {!editando && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => {
              setTexto(valor)
              setEditando(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            {valor ? "Editar" : "Preencher"}
          </Button>
        )}
      </div>

      {editando ? (
        <form action={formAction} className="mt-3">
          <input type="hidden" name="id" value={clienteId} />
          <input type="hidden" name="secao" value={secao.id} />
          <Textarea
            name="conteudo"
            rows={5}
            placeholder={secao.placeholder}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="field-sizing-fixed resize-y"
            autoFocus
          />
          {estado.erro && <p className="mt-2 text-sm text-destructive">{estado.erro}</p>}
          <div className="mt-3 flex items-center gap-2">
            <BotaoSalvar />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setEditando(false)}
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          {valor ? (
            <p className={cn("whitespace-pre-wrap text-pretty text-sm leading-relaxed text-foreground")}>{valor}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Ainda não preenchido.</p>
          )}
        </div>
      )}
    </div>
  )
}
