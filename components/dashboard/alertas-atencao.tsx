"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  ImageOff,
  ListChecks,
  Radar,
  TrendingDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AlertaCliente, PrioridadeAlerta } from "@/lib/clientes-db"

// Quantos alertas aparecem antes do "+ N outras pendências".
const VISIVEIS = 6

// A operação pensa em ALTA / MÉDIA / BAIXA. No banco os níveis são
// critico/atencao/acompanhar — este mapa traduz sem perder a semântica.
const NIVEL_LABEL: Record<PrioridadeAlerta, string> = {
  critico: "Alta",
  atencao: "Média",
  acompanhar: "Baixa",
}

// Realce por prioridade — percebido por contraste e ícone, não por saturação.
const estiloNivel: Record<PrioridadeAlerta, string> = {
  critico: "bg-destructive/12 text-destructive ring-destructive/20",
  atencao: "bg-warning/12 text-warning ring-warning/20",
  acompanhar: "bg-primary/12 text-primary ring-primary/20",
}

// Ícone contextual por origem do alerta.
const iconePorCategoria: Record<AlertaCliente["categoria"], typeof ImageOff> = {
  conteudo: ImageOff,
  aprovacao: FileText,
  renovacao: CalendarClock,
  meta: TrendingDown,
  tarefa: ListChecks,
}

type Filtro = "todos" | PrioridadeAlerta

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "critico", label: "Alta" },
  { id: "atencao", label: "Média" },
  { id: "acompanhar", label: "Baixa" },
]

function AlertaItem({ alerta }: { alerta: AlertaCliente }) {
  const Icon = iconePorCategoria[alerta.categoria]
  return (
    <Link
      href={alerta.acaoUrl}
      className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
          estiloNivel[alerta.prioridade],
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{alerta.clienteNome}</p>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
              estiloNivel[alerta.prioridade],
            )}
          >
            {NIVEL_LABEL[alerta.prioridade]}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{alerta.texto}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
        <span className="hidden sm:inline">{alerta.acaoLabel}</span>
        <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  )
}

export function CentralAtencao({ alertas }: { alertas: AlertaCliente[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [expandido, setExpandido] = useState(false)

  const contagem = useMemo(
    () => ({
      todos: alertas.length,
      critico: alertas.filter((a) => a.prioridade === "critico").length,
      atencao: alertas.filter((a) => a.prioridade === "atencao").length,
      acompanhar: alertas.filter((a) => a.prioridade === "acompanhar").length,
    }),
    [alertas],
  )

  const filtrados = useMemo(
    () => (filtro === "todos" ? alertas : alertas.filter((a) => a.prioridade === filtro)),
    [alertas, filtro],
  )

  const total = alertas.length
  const visiveis = expandido ? filtrados : filtrados.slice(0, VISIVEIS)
  const restantes = filtrados.length - visiveis.length

  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Radar className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-medium tracking-tight text-foreground">
              Central de Atenção
            </h3>
            <p className="text-sm text-muted-foreground">Tudo que merece sua atenção agora.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Atualizado agora
          </span>
          <Link
            href="/clientes"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            Ver tudo
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {total > 0 ? (
        <>
          {/* Resumo + filtros por prioridade */}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm font-medium text-foreground">
              {total} {total === 1 ? "ponto merece" : "pontos merecem"} sua atenção
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FILTROS.map((f) => {
                const n = contagem[f.id]
                const ativo = filtro === f.id
                const vazio = f.id !== "todos" && n === 0
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFiltro(f.id)
                      setExpandido(false)
                    }}
                    disabled={vazio}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      ativo
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
                      vazio && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
                    )}
                  >
                    {f.label}
                    <span className="tabular-nums">{n}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lista — duas colunas no desktop, lista vertical no mobile */}
          <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {visiveis.map((a, i) => (
              <AlertaItem key={`${a.clienteId}-${a.categoria}-${i}`} alerta={a} />
            ))}
          </div>

          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setExpandido(true)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
            >
              + {restantes} {restantes === 1 ? "outra pendência" : "outras pendências"}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
          {expandido && filtrados.length > VISIVEIS && (
            <button
              type="button"
              onClick={() => setExpandido(false)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Mostrar menos
            </button>
          )}
        </>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-medium text-foreground">Tudo em dia</p>
            <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
              Nenhuma pendência crítica encontrada agora.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/70">Continue assim.</p>
        </div>
      )}
    </section>
  )
}
