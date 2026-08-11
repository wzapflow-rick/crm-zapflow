"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ImageOff,
  ListChecks,
  Radar,
  TrendingDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { AlertaCliente, PrioridadeAlerta } from "@/lib/clientes-db"

const VISIVEIS = 4

// Estilo do indicador de prioridade — pequenos pontos de cor, sem grandes áreas.
const estiloPrioridade: Record<PrioridadeAlerta, string> = {
  critico: "bg-destructive/12 text-destructive",
  atencao: "bg-warning/12 text-warning",
  acompanhar: "bg-primary/12 text-primary",
}

// Ícone contextual por origem do alerta.
const iconePorCategoria: Record<AlertaCliente["categoria"], typeof ImageOff> = {
  conteudo: ImageOff,
  renovacao: CalendarClock,
  meta: TrendingDown,
  tarefa: ListChecks,
}

function AlertaItem({ alerta }: { alerta: AlertaCliente }) {
  const Icon = iconePorCategoria[alerta.categoria]
  return (
    <Link
      href={alerta.acaoUrl}
      className="group flex items-center gap-3 rounded-lg border border-transparent p-2 -mx-2 transition-colors hover:border-border hover:bg-muted/50"
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          estiloPrioridade[alerta.prioridade],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{alerta.clienteNome}</p>
        <p className="truncate text-xs text-muted-foreground">{alerta.texto}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
        {alerta.acaoLabel}
        <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  )
}

export function AlertasAtencao({ alertas }: { alertas: AlertaCliente[] }) {
  const [aberto, setAberto] = useState(false)
  const total = alertas.length
  const visiveis = alertas.slice(0, VISIVEIS)
  const criticos = alertas.filter((a) => a.prioridade === "critico").length

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Radar className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight text-foreground">
            Clientes que precisam de atenção
          </h3>
          <p className="text-xs text-muted-foreground">Alertas operacionais que merecem sua atenção</p>
        </div>
        {total > 0 && (
          <span
            className={cn(
              "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              criticos > 0 ? "bg-destructive/12 text-destructive" : "bg-primary/12 text-primary",
            )}
          >
            {total} {total === 1 ? "alerta" : "alertas"}
          </span>
        )}
      </div>

      {total > 0 ? (
        <>
          <div className="mt-4 flex flex-col gap-1">
            {visiveis.map((a, i) => (
              <AlertaItem key={`${a.clienteId}-${a.categoria}-${i}`} alerta={a} />
            ))}
          </div>

          {total > VISIVEIS && (
            <Dialog open={aberto} onOpenChange={setAberto}>
              <DialogTrigger className="mt-3 inline-flex items-center gap-1 self-start text-xs font-medium text-primary transition-opacity hover:opacity-80">
                Ver todos os alertas
                <ArrowRight className="h-3 w-3" />
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    Clientes que precisam de atenção
                  </DialogTitle>
                  <DialogDescription>
                    {total} {total === 1 ? "alerta ativo" : "alertas ativos"} na operação, ordenados por
                    prioridade.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-3">
                  <div className="flex flex-col gap-1">
                    {alertas.map((a, i) => (
                      <div key={`${a.clienteId}-${a.categoria}-all-${i}`} onClick={() => setAberto(false)}>
                        <AlertaItem alerta={a} />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-foreground">Operação em dia</p>
          <p className="max-w-[220px] text-xs text-muted-foreground">
            Nenhum cliente precisa de atenção no momento.
          </p>
        </div>
      )}
    </div>
  )
}
