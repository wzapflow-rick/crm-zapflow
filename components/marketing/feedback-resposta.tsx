"use client"

import { useState } from "react"
import { ThumbsUp, Meh, CheckCheck, PenLine, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { registrarFeedbackAction } from "@/app/(crm)/marketing/chat-actions"
import type { TipoFeedback } from "@/lib/feedback-ia-db"

const OPCOES: { tipo: TipoFeedback; rotulo: string; Icone: typeof ThumbsUp }[] = [
  { tipo: "util", rotulo: "Útil", Icone: ThumbsUp },
  { tipo: "generica", rotulo: "Genérica", Icone: Meh },
  { tipo: "aplicada", rotulo: "Aplicada", Icone: CheckCheck },
  { tipo: "ajustada", rotulo: "Ajustada", Icone: PenLine },
  { tipo: "descartada", rotulo: "Descartada", Icone: X },
]

export function FeedbackResposta({
  empresaId,
  resposta,
  pergunta,
  valorInicial = null,
}: {
  empresaId: string
  resposta: string
  pergunta: string
  valorInicial?: TipoFeedback | null
}) {
  const [selecionado, setSelecionado] = useState<TipoFeedback | null>(valorInicial)
  const [salvando, setSalvando] = useState<TipoFeedback | null>(null)

  async function escolher(tipo: TipoFeedback) {
    const proximo = selecionado === tipo ? null : tipo
    const anterior = selecionado
    setSelecionado(proximo) // otimista
    setSalvando(tipo)
    const { ok } = await registrarFeedbackAction({ empresaId, resposta, pergunta, avaliacao: proximo })
    if (!ok) setSelecionado(anterior) // reverte em caso de falha
    setSalvando(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pl-1">
      <span className="text-[11px] text-muted-foreground">Este resultado foi:</span>
      {OPCOES.map(({ tipo, rotulo, Icone }) => {
        const ativo = selecionado === tipo
        return (
          <button
            key={tipo}
            type="button"
            onClick={() => escolher(tipo)}
            disabled={salvando !== null}
            aria-pressed={ativo}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-60",
              ativo
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            <Icone className="h-3 w-3" />
            {rotulo}
          </button>
        )
      })}
    </div>
  )
}
