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
import type { ResumoCrm } from "@/lib/crm-db"
import type { ResumoTarefas } from "@/lib/tarefas-db"
import type { ResumoFinanceiro } from "@/lib/financeiro-db"
import type { ProximaGravacao } from "@/lib/eventos-db"
import type { Membro } from "@/lib/membros-db"
import { insightsSemana, receitaMensal } from "@/lib/simple-data"

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

// Iniciais (até 2 letras) a partir do nome do cliente para o avatar da gravação.
const iniciaisDe = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "—"

// "2026-06-27" -> "27/06"
const formatarDataCurta = (iso: string) => {
  const partes = iso.split("-")
  if (partes.length !== 3) return iso
  return `${partes[2]}/${partes[1]}`
}

const prioridadeEstilo: Record<string, string> = {
  alta: "bg-primary/10 text-primary",
  media: "bg-chart-2/15 text-chart-2",
  baixa: "bg-muted text-muted-foreground",
}

const acoesRapidas = [
  { label: "Novo cliente", icon: UserPlus },
  { label: "Nova proposta", icon: FileText },
  { label: "Nova tarefa", icon: Plus },
  { label: "Novo lead", icon: Target },
]

export function Dashboard({
  resumoCrm,
  resumoTarefas,
  resumoFinanceiro,
  totalClientes,
  clientesAtivos,
  proximasGravacoes,
  membros,
}: {
  resumoCrm: ResumoCrm
  resumoTarefas: ResumoTarefas
  resumoFinanceiro: ResumoFinanceiro | null
  totalClientes: number
  clientesAtivos: number
  proximasGravacoes: ProximaGravacao[]
  membros: Membro[]
}) {
  const { usuario } = useApp()
  // Dados financeiros reais do mês (com fallback seguro caso o módulo não carregue)
  const receitaTotal = resumoFinanceiro?.receitaTotal ?? 0
  const receitaMrr = resumoFinanceiro?.receitaMrr ?? 0
  const meta = resumoFinanceiro?.meta ?? 0
  const progresso = resumoFinanceiro?.progressoMeta ?? 0
  const leadsAbertos = resumoCrm.leadsEmAberto
  const totalLeads = resumoCrm.valorEmAberto
  const membroPorId = (id: string) => membros.find((m) => m.id === id)

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
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
              {brl(receitaTotal)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {meta > 0 ? `de ${brl(meta)}` : "Defina a meta no Financeiro"}
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
            valor={brl(receitaMrr)}
            icon={TrendingUp}
            hint="Recorrente dos clientes ativos"
            hintPositivo
          />
          <StatCard
            label="Clientes ativos"
            valor={String(clientesAtivos)}
            icon={Users}
            hint={`${totalClientes} no total`}
          />
          <StatCard
            label="Leads em aberto"
            valor={String(resumoCrm.qtdEmAberto)}
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
            {proximasGravacoes.length > 0 ? (
              <ul className="divide-y divide-border">
                {proximasGravacoes.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                        {iniciaisDe(g.clienteNome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {g.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {g.clienteNome || "Interno"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-foreground">{formatarDataCurta(g.data)}</p>
                      {g.hora && <p className="text-[11px] text-muted-foreground">{g.hora}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma gravação agendada. Crie um compromisso do tipo &quot;Gravação&quot; no Calendário.
              </p>
            )}
          </Painel>

          {/* Tarefas urgentes (dados reais do módulo Tarefas) */}
          <Painel titulo="Tarefas urgentes" icon={Flame}>
            {resumoTarefas.urgentes.length > 0 ? (
              <ul className="divide-y divide-border">
                {resumoTarefas.urgentes.map((t) => {
                  const resp = membroPorId(t.responsavelId)
                  return (
                    <li key={t.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {t.titulo}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.clienteNome ?? "Interno"}
                          {resp ? ` · ${resp.nome}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", prioridadeEstilo[t.prioridade])}>
                          {t.prioridade}
                        </span>
                        <span className={cn("text-[11px]", t.atrasada ? "font-medium text-destructive" : "text-muted-foreground")}>
                          {t.prazoLabel}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma tarefa pendente. Crie tarefas no módulo Tarefas.
              </p>
            )}
          </Painel>

          {/* Leads em aberto (dados reais do CRM) */}
          <Painel titulo="Leads em aberto" icon={Target}>
            {leadsAbertos.length > 0 ? (
              <ul className="divide-y divide-border">
                {leadsAbertos.slice(0, 6).map((l) => {
                  const resp = membroPorId(l.responsavelId)
                  return (
                    <li key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {l.empresa}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.etapaLabel}
                          {resp ? ` · ${resp.nome}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-foreground">
                        {brl(l.valor)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum lead em aberto no funil. Adicione negócios no CRM.
              </p>
            )}
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
