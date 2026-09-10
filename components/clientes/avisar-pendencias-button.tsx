"use client"

import { useState, useTransition } from "react"
import { BellRing, Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { avisarPendenciasClienteAction } from "@/app/(crm)/clientes/aviso-pendencias-actions"

// Botão manual no detalhe do cliente: dispara na hora o aviso de conteúdos
// aguardando aprovação no WhatsApp do cliente. Só aparece quando há pendências.
export function AvisarPendenciasButton({
  clienteId,
  pendentes,
  temTelefone,
}: {
  clienteId: string
  pendentes: number
  temTelefone: boolean
}) {
  const [status, setStatus] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null)
  const [enviando, iniciar] = useTransition()

  if (pendentes <= 0) return null

  const avisar = () => {
    setStatus(null)
    iniciar(async () => {
      const r = await avisarPendenciasClienteAction(clienteId)
      setStatus(
        r.ok && r.enviado
          ? { tipo: "ok", msg: "Aviso enviado no WhatsApp do cliente!" }
          : { tipo: "erro", msg: r.erro || "Não foi possível enviar o aviso." },
      )
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={avisar}
        disabled={enviando || !temTelefone}
        title={temTelefone ? undefined : "Cadastre o telefone do cliente para enviar o aviso."}
      >
        {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
        Avisar aprovação no WhatsApp
      </Button>
      {!temTelefone && !status && (
        <span className="text-xs text-muted-foreground">Sem telefone cadastrado.</span>
      )}
      {status && (
        <span
          className={cn(
            "flex items-center gap-1 text-xs",
            status.tipo === "ok" ? "text-emerald-500" : "text-destructive",
          )}
        >
          {status.tipo === "ok" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {status.msg}
        </span>
      )}
    </div>
  )
}
