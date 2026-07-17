"use client"

import { useMemo, useState } from "react"
import { Check, Lightbulb, Package, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { metodoEtapas } from "@/lib/metodo-data"

export function MetodoView() {
  const [ativa, setAtiva] = useState(0)
  // Itens marcados por etapa (local/efêmero — só para acompanhamento visual).
  const [marcados, setMarcados] = useState<Record<number, Set<number>>>({})

  const etapa = metodoEtapas[ativa]
  const marcadosEtapa = marcados[ativa] ?? new Set<number>()

  const progresso = useMemo(
    () => Math.round((marcadosEtapa.size / etapa.checklist.length) * 100),
    [marcadosEtapa, etapa.checklist.length],
  )

  function alternar(indice: number) {
    setMarcados((prev) => {
      const atual = new Set(prev[ativa] ?? [])
      if (atual.has(indice)) atual.delete(indice)
      else atual.add(indice)
      return { ...prev, [ativa]: atual }
    })
  }

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
        {/* Cabeçalho */}
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">Nosso processo</p>
          <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground text-balance md:text-6xl">
            O Método <span className="text-primary">SIMPLE</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Seis etapas que transformam a comunicação de um cliente em crescimento real. Cada projeto passa por elas, do
            onboarding à evolução contínua.
          </p>
        </header>

        {/* Seletor de etapas (letras S.I.M.P.L.E) */}
        <nav aria-label="Etapas do método" className="mt-10 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {metodoEtapas.map((e, i) => {
            const selecionada = i === ativa
            return (
              <button
                key={e.letra}
                type="button"
                onClick={() => setAtiva(i)}
                aria-current={selecionada ? "step" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors",
                  selecionada
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
                )}
              >
                <span className="font-serif text-2xl font-light leading-none md:text-3xl">{e.letra}</span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    selecionada ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {e.titulo}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Detalhe da etapa */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary font-serif text-3xl font-light text-primary-foreground">
              {etapa.letra}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                Etapa {ativa + 1} de {metodoEtapas.length}
              </p>
              <h2 className="mt-1 font-serif text-3xl font-light tracking-tight text-foreground">{etapa.titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{etapa.resumo}</p>
            </div>
          </div>

          {/* Objetivo */}
          <div className="mt-6 flex gap-3 rounded-xl bg-muted p-4">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Objetivo</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{etapa.objetivo}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Checklist</h3>
                <span className="text-xs font-medium text-muted-foreground">{progresso}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <ul className="mt-4 space-y-2">
                {etapa.checklist.map((item, i) => {
                  const feito = marcadosEtapa.has(i)
                  return (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => alternar(i)}
                        className="flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                            feito ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                          )}
                        >
                          {feito && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span
                          className={cn(
                            "text-sm leading-snug",
                            feito ? "text-muted-foreground line-through" : "text-foreground",
                          )}
                        >
                          {item}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Entregáveis */}
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Entregáveis</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {etapa.entregaveis.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Dica */}
          <div className="mt-6 flex gap-3 rounded-xl border border-primary/20 bg-accent p-4">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
            <div>
              <h3 className="text-sm font-semibold text-accent-foreground">Dica SIMPLE</h3>
              <p className="mt-1 text-sm leading-relaxed text-accent-foreground/80">{etapa.dica}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
