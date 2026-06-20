"use client"

import { useState } from "react"
import {
  Users2,
  Phone,
  CheckSquare,
  Repeat,
  Clock,
  Circle,
  CheckCircle2,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  diasSemana,
  type TipoEvento,
  type Tarefa,
  type Evento,
  type Membro,
} from "@/lib/zapflow-data"
import { alternarTarefa as alternarTarefaAction } from "@/app/actions/crm"
import { useApp } from "@/components/crm/providers"

const tipoConfig: Record<
  TipoEvento,
  { label: string; icon: typeof Users2; cor: string }
> = {
  reuniao: { label: "Reunião", icon: Users2, cor: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  ligacao: { label: "Ligação", icon: Phone, cor: "bg-chart-1/15 text-chart-1 border-chart-1/30" },
  tarefa: { label: "Tarefa", icon: CheckSquare, cor: "bg-chart-3/15 text-chart-3 border-chart-3/30" },
  "follow-up": { label: "Follow-up", icon: Repeat, cor: "bg-chart-4/15 text-chart-4 border-chart-4/30" },
}

const prioridadeCor: Record<Tarefa["prioridade"], string> = {
  alta: "bg-destructive/10 text-destructive",
  media: "bg-chart-3/15 text-chart-3",
  baixa: "bg-muted text-muted-foreground",
}

export function Agenda({
  eventosIniciais,
  tarefasIniciais,
  membros,
}: {
  eventosIniciais: Evento[]
  tarefasIniciais: Tarefa[]
  membros: Membro[]
}) {
  const { usuario, isAdmin } = useApp()
  const [tarefas, setTarefas] = useState(tarefasIniciais)

  const membroPorId = (id: string | null) =>
    id ? membros.find((m) => m.id === id) : undefined

  // Atendente vê só os próprios itens; admin vê tudo.
  const eventosVisiveis = isAdmin
    ? eventosIniciais
    : eventosIniciais.filter((e) => e.responsavelId === usuario.id)
  const tarefasVisiveis = isAdmin
    ? tarefas
    : tarefas.filter((t) => t.responsavelId === usuario.id)

  function alternarTarefa(id: string) {
    let concluida = false
    setTarefas((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const novoStatus = t.status === "concluida" ? "pendente" : "concluida"
        concluida = novoStatus === "concluida"
        return { ...t, status: novoStatus }
      }),
    )
    void alternarTarefaAction(id, concluida)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Planejamento semanal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Planejamento da semana
            </p>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "Linha de trabalho de toda a equipe"
                : "Suas atividades da semana"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(tipoConfig).map(([k, v]) => (
              <span
                key={k}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span className={cn("h-2 w-2 rounded-full", v.cor.split(" ")[0])} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-5">
            {diasSemana.map((dia, idx) => {
              const doDia = eventosVisiveis
                .filter((e) => e.diaSemana === idx)
                .sort((a, b) => a.inicio.localeCompare(b.inicio))
              return (
                <div key={dia} className="min-h-48 bg-background p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {dia}
                  </p>
                  <div className="flex flex-col gap-2">
                    {doDia.map((ev) => {
                      const cfg = tipoConfig[ev.tipo]
                      const Icon = cfg.icon
                      const resp = membroPorId(ev.responsavelId)
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "rounded-md border p-2",
                            cfg.cor,
                            ev.concluido && "opacity-50",
                          )}
                        >
                          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium">
                            <Icon className="h-3 w-3" />
                            <Clock className="ml-auto h-3 w-3 opacity-70" />
                            {ev.inicio}
                          </div>
                          <p className="text-xs font-medium leading-snug text-foreground">
                            {ev.titulo}
                          </p>
                          {isAdmin && resp && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback
                                  className={cn(
                                    resp.cor,
                                    "text-[8px] text-white",
                                  )}
                                >
                                  {resp.iniciais}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-muted-foreground">
                                {resp.nome.split(" ")[0]}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {doDia.length === 0 && (
                      <p className="text-[11px] text-muted-foreground/60">
                        Sem atividades
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Tarefas pendentes */}
      <div className="flex w-full shrink-0 flex-col border-t border-border bg-card lg:w-80 lg:border-l lg:border-t-0">
        <div className="border-b border-border px-5 py-3">
          <p className="text-sm font-semibold text-foreground">
            Tarefas pendentes
          </p>
          <p className="text-xs text-muted-foreground">
            {tarefasVisiveis.filter((t) => t.status !== "concluida").length} em
            aberto
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {tarefasVisiveis.map((t) => {
              const resp = membroPorId(t.responsavelId)
              const feita = t.status === "concluida"
              return (
                <div
                  key={t.id}
                  className="flex gap-3 border-b border-border/60 p-3"
                >
                  <button
                    onClick={() => alternarTarefa(t.id)}
                    className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                    aria-label={feita ? "Reabrir tarefa" : "Concluir tarefa"}
                  >
                    {feita ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-snug text-foreground",
                        feita && "text-muted-foreground line-through",
                      )}
                    >
                      {t.titulo}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
                          prioridadeCor[t.prioridade],
                        )}
                      >
                        {t.prioridade}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t.prazo}
                      </span>
                      {isAdmin && resp && (
                        <Badge
                          variant="secondary"
                          className="h-4 gap-1 px-1.5 text-[10px] font-normal"
                        >
                          {resp.nome.split(" ")[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
