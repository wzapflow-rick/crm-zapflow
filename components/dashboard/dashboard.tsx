"use client"

import {
  ArrowUpRight,
  UserPlus,
  FileText,
  Plus,
  Target,
  Video,
  TrendingUp,
  Users,
  Flame,
  Lightbulb,
  CircleDot,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/simple/providers"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import {
  clientes,
  clientesAtivos,
  fundadores,
  insightsSemana,
  leadsAbertos,
  metaMensal,
  proximasGravacoes,
  receitaAtual,
  receitaMensal,
  tarefasUrgentes,
} from "@/lib/simple-data"

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

const clientePorId = (id: string | null) => clientes.find((c) => c.id === id)
const fundadorPorId = (id: string) => fundadores.find((f) => f.id === id)

const prioridadeEstilo: Record<string, string> = {
  alta: "bg-primary/10 text-primary",
  media: "bg-chart-2/15 text-chart-2",
  baixa: "bg-muted text-muted-foreground",
}

const statusLeadLabel: Record<string, string> = {
  novo: "Lead novo",
  contato: "Primeiro contato",
  reuniao: "Reunião marcada",
  proposta: "Proposta enviada",
  negociacao: "Negociação",
}

const acoesRapidas = [
  { label: "Novo cliente", icon: UserPlus },
  { label: "Nova proposta", icon: FileText },
  { label: "Nova tarefa", icon: Plus },
  { label: "Novo lead", icon: Target },
]

export function Dashboard() {
  const { usuario } = useApp()
  const progresso = Math.min(100, Math.round((receitaAtual / metaMensal) * 100))
  const totalLeads = leadsAbertos.reduce((acc, l) => acc + l.valor, 0)

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Saudação + missão + ações */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Olá, {usuario.nome}.
            </h2>
            <p className="mt-1.5 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
              Entramos no negócio dos nossos clientes para que mais clientes
              entrem na empresa deles. Esta é a operação da SIMPLE, em tempo real.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {acoesRapidas.map((a) => {
              const Icon = a.icon
              return (
                <Button
                  key={a.label}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 bg-card"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {a.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Meta do mês</span>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {brl(receitaAtual)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              de {brl(metaMensal)}
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-medium text-primary">
              {progresso}% da meta
            </p>
          </div>

          <StatCard
            label="Receita mensal (MRR)"
            valor={brl(receitaAtual)}
            icon={TrendingUp}
            hint="+12% vs. mês anterior"
            hintPositivo
          />
          <StatCard
            label="Clientes ativos"
            valor={String(clientesAtivos)}
            icon={Users}
            hint={`${clientes.length} no total`}
          />
          <StatCard
            label="Leads em aberto"
            valor={String(leadsAbertos.length)}
            icon={Flame}
            hint={`${brl(totalLeads)} em potencial`}
          />
        </div>

        {/* Receita + Insights */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Evolução da receita
                </h3>
                <p className="text-xs text-muted-foreground">
                  MRR nos últimos 7 meses
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                <ArrowUpRight className="h-3 w-3" />
                Crescendo
              </span>
            </div>
            <div className="mt-4">
              <RevenueChart dados={receitaMensal} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Insights da semana
              </h3>
            </div>
            <ul className="mt-4 space-y-3">
              {insightsSemana.map((insight, i) => (
                <li key={i} className="flex gap-2.5">
                  <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-sm leading-snug text-foreground">
                    {insight}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Gravações + Tarefas + Leads */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Próximas gravações */}
          <Painel titulo="Próximas gravações" icon={Video}>
            <ul className="divide-y divide-border">
              {proximasGravacoes.map((g) => {
                const c = clientePorId(g.clienteId)
                return (
                  <li key={g.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={cn(c?.cor, "text-[10px] text-primary-foreground")}>
                        {c?.iniciais}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {g.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">{c?.nome}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-foreground">{g.data}</p>
                      <p className="text-[11px] text-muted-foreground">{g.hora}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Painel>

          {/* Tarefas urgentes */}
          <Painel titulo="Tarefas urgentes" icon={Flame}>
            <ul className="divide-y divide-border">
              {tarefasUrgentes.map((t) => {
                const c = clientePorId(t.clienteId)
                const resp = fundadorPorId(t.responsavelId)
                return (
                  <li key={t.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-foreground">
                        {t.titulo}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c ? c.nome : "Interno"} · {resp?.nome}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", prioridadeEstilo[t.prioridade])}>
                        {t.prioridade}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{t.prazo}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Painel>

          {/* Leads em aberto */}
          <Painel titulo="Leads em aberto" icon={Target}>
            <ul className="divide-y divide-border">
              {leadsAbertos.map((l) => {
                const resp = fundadorPorId(l.responsavelId)
                return (
                  <li key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {l.empresa}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {statusLeadLabel[l.status]} · {resp?.nome}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-foreground">
                      {brl(l.valor)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Painel>
        </div>
      </div>
    </main>
  )
}

function StatCard({
  label,
  valor,
  icon: Icon,
  hint,
  hintPositivo,
}: {
  label: string
  valor: string
  icon: typeof Target
  hint: string
  hintPositivo?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {valor}
      </p>
      <p className={cn("mt-1.5 text-xs", hintPositivo ? "font-medium text-primary" : "text-muted-foreground")}>
        {hint}
      </p>
    </div>
  )
}

function Painel({
  titulo,
  icon: Icon,
  children,
}: {
  titulo: string
  icon: typeof Target
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
      </div>
      {children}
    </div>
  )
}
