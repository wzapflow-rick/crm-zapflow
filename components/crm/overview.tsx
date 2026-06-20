"use client"

import Link from "next/link"
import {
  MessageSquare,
  Clock,
  CheckSquare,
  UserX,
  ArrowRight,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  conversas,
  tarefas,
  membroPorId,
  eventos,
} from "@/lib/zapflow-data"
import { useApp } from "@/components/crm/providers"

export function Overview() {
  const { usuario, isAdmin } = useApp()

  const abertas = conversas.filter((c) => c.status === "aberta").length
  const pendentes = conversas.filter((c) => c.status === "pendente").length
  const naoAtribuidas = conversas.filter((c) => c.responsavelId === null).length
  const tarefasAbertas = tarefas.filter((t) => t.status !== "concluida").length

  const kpis = [
    { label: "Conversas abertas", valor: abertas, icon: MessageSquare, cor: "text-primary" },
    { label: "Aguardando resposta", valor: pendentes, icon: Clock, cor: "text-chart-3" },
    { label: "Sem responsável", valor: naoAtribuidas, icon: UserX, cor: "text-chart-4" },
    { label: "Tarefas em aberto", valor: tarefasAbertas, icon: CheckSquare, cor: "text-chart-2" },
  ]

  const minhasConversas = conversas.filter(
    (c) => c.responsavelId === usuario.id,
  )
  const meusEventosHoje = eventos.filter(
    (e) => e.diaSemana === 0 && (isAdmin || e.responsavelId === usuario.id),
  )

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Bom dia, {usuario.nome.split(" ")[0]}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Aqui está o panorama da operação da equipe."
              : "Aqui está o seu resumo de hoje."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon
            return (
              <div
                key={k.label}
                className="rounded-lg border border-border bg-card p-4"
              >
                <Icon className={cn("h-5 w-5", k.cor)} />
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {k.valor}
                </p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {isAdmin ? "Conversas em destaque" : "Minhas conversas"}
              </p>
              <Link
                href="/inbox"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Abrir inbox <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border/60">
              {(isAdmin ? conversas : minhasConversas).slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href="/inbox"
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn(c.cor, "text-xs text-white")}>
                      {c.iniciais}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.contatoNome}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.ultimaMensagem}
                    </p>
                  </div>
                  {c.naoLidas > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                      {c.naoLidas}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Agenda de hoje
              </p>
              <Link
                href="/agenda"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Ver planejamento <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border/60">
              {meusEventosHoje.map((ev) => {
                const resp = membroPorId(ev.responsavelId)
                return (
                  <div key={ev.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">
                      {ev.inicio}
                    </span>
                    <p className="flex-1 text-sm text-foreground">{ev.titulo}</p>
                    {isAdmin && resp && (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className={cn(resp.cor, "text-[10px] text-white")}
                        >
                          {resp.iniciais}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )
              })}
              {meusEventosHoje.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nada agendado para hoje.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
