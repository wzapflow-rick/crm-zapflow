"use client"

import { useMemo, useState } from "react"
import { CalendarRange, Pencil, Plus, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { EstrategiaMensalDialog } from "@/components/clientes/estrategia-mensal-dialog"
import { ExcluirEstrategiaMensalButton } from "@/components/clientes/excluir-estrategia-mensal-button"
import type { EstrategiaMensal, KpiMensal, StatusEstrategiaMensal } from "@/lib/estrategia-mensal-db"

const statusInfo: Record<StatusEstrategiaMensal, { label: string; classe: string }> = {
  planejado: { label: "Planejado", classe: "bg-primary/10 text-primary" },
  em_andamento: { label: "Em andamento", classe: "bg-chart-3/15 text-chart-3" },
  concluido: { label: "Concluído", classe: "bg-chart-4/15 text-chart-4" },
}

// "2026-03" -> "Março de 2026"
function rotuloCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number)
  if (!ano || !mes) return competencia
  const data = new Date(ano, mes - 1, 1)
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Interpreta valores como "120000", "84,2 mil", "8", "5%". Retorna null quando não é numérico.
function paraNumero(valor: string): number | null {
  if (!valor) return null
  const s = valor.toLowerCase().trim()
  let mult = 1
  if (/\bmil\b/.test(s) || /\d\s*k\b/.test(s) || /\dk$/.test(s)) mult = 1000
  if (/\bmi\b|milh/.test(s)) mult = 1_000_000
  let limpo = s.replace(/[^0-9,.-]/g, "")
  if (limpo.includes(".") && limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".")
  else if (limpo.includes(",")) limpo = limpo.replace(",", ".")
  const n = Number.parseFloat(limpo)
  return Number.isFinite(n) ? n * mult : null
}

function KpiLinha({ kpi }: { kpi: KpiMensal }) {
  const alvo = paraNumero(kpi.alvo)
  const realizado = paraNumero(kpi.realizado)
  const temProgresso = alvo != null && alvo > 0 && realizado != null
  const pct = temProgresso ? Math.min(Math.round((realizado! / alvo!) * 100), 100) : 0
  const atingiu = temProgresso && realizado! >= alvo!

  return (
    <div className="grid gap-1.5 rounded-lg border border-border bg-background p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{kpi.rotulo}</span>
        <span className="text-sm text-muted-foreground">
          <span className={cn("font-semibold", atingiu ? "text-chart-4" : "text-foreground")}>
            {kpi.realizado || "—"}
          </span>
          {" / "}
          {kpi.alvo || "—"}
        </span>
      </div>
      {temProgresso ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="presentation">
          <div
            className={cn("h-full rounded-full transition-all", atingiu ? "bg-chart-4" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {kpi.realizado ? "Comparação numérica indisponível" : "Aguardando o realizado do mês"}
        </p>
      )}
    </div>
  )
}

export function EstrategiaMensalPanel({
  clienteId,
  estrategias,
}: {
  clienteId: string
  estrategias: EstrategiaMensal[]
}) {
  const [selecionada, setSelecionada] = useState(estrategias[0]?.competencia ?? "")
  const competencias = useMemo(() => estrategias.map((e) => e.competencia), [estrategias])
  const atual = estrategias.find((e) => e.competencia === selecionada) ?? estrategias[0]

  if (estrategias.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <CalendarRange className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Nenhuma estratégia mensal ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie o plano do mês com objetivo, pilares, campanhas e KPIs — e acompanhe o realizado.
          </p>
        </div>
        <EstrategiaMensalDialog
          clienteId={clienteId}
          competenciasExistentes={competencias}
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Criar estratégia mensal
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {/* Cabeçalho: seletor de mês + ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {estrategias.map((e) => (
            <button
              key={e.competencia}
              type="button"
              onClick={() => setSelecionada(e.competencia)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                e.competencia === (atual?.competencia ?? "")
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
              )}
            >
              {rotuloCompetencia(e.competencia)}
            </button>
          ))}
        </div>
        <EstrategiaMensalDialog
          clienteId={clienteId}
          competenciasExistentes={competencias}
          trigger={
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Novo mês
            </Button>
          }
        />
      </div>

      {atual && (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{rotuloCompetencia(atual.competencia)}</h3>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusInfo[atual.status].classe)}>
                  {statusInfo[atual.status].label}
                </span>
              </div>
              {atual.objetivo && (
                <p className="mt-2 flex items-start gap-2 text-pretty text-sm leading-relaxed text-foreground">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {atual.objetivo}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <EstrategiaMensalDialog
                clienteId={clienteId}
                registro={atual}
                competenciasExistentes={competencias}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                }
              />
              <ExcluirEstrategiaMensalButton
                id={atual.id}
                clienteId={clienteId}
                rotulo={rotuloCompetencia(atual.competencia)}
              />
            </div>
          </div>

          {/* Pilares + KPIs */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pilares</p>
                {atual.pilares.length > 0 ? (
                  <ul className="space-y-2">
                    {atual.pilares.map((p, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-snug text-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem pilares definidos.</p>
                )}
              </div>
              {atual.calendarioResumo && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ritmo do mês
                  </p>
                  <p className="text-pretty text-sm leading-relaxed text-foreground">{atual.calendarioResumo}</p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                KPIs — planejado x realizado
              </p>
              {atual.kpis.length > 0 ? (
                <div className="grid gap-2">
                  {atual.kpis.map((k, i) => (
                    <KpiLinha key={i} kpi={k} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum KPI definido.</p>
              )}
            </div>
          </div>

          {/* Campanhas */}
          {atual.campanhas.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Campanhas / séries
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {atual.campanhas.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-sm font-medium text-foreground">{c.nome}</p>
                    {c.descricao && <p className="mt-1 text-sm leading-snug text-muted-foreground">{c.descricao}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retrospectiva */}
          {atual.retrospectiva && (
            <div className="rounded-lg border border-chart-2/30 bg-chart-2/5 p-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-chart-2">Retrospectiva</p>
              <p className="text-pretty text-sm leading-relaxed text-foreground">{atual.retrospectiva}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
