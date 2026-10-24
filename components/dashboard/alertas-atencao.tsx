"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  ImageOff,
  Lightbulb,
  ListChecks,
  Radar,
  RefreshCw,
  TrendingDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { carregarSugestoesAction } from "@/app/(crm)/sugestoes-actions"
import type { AlertaCliente, PrioridadeAlerta } from "@/lib/clientes-db"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  sugestao: Lightbulb,
}

type Filtro = "todos" | PrioridadeAlerta

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "critico", label: "Alta" },
  { id: "atencao", label: "Média" },
  { id: "acompanhar", label: "Baixa" },
]

// Rótulo humano da origem do alerta, usado no card detalhado.
const CATEGORIA_LABEL: Record<AlertaCliente["categoria"], string> = {
  conteudo: "Conteúdo & Instagram",
  aprovacao: "Aprovação de conteúdo",
  renovacao: "Renovação de contrato",
  meta: "Meta do mês",
  tarefa: "Tarefas",
  sugestao: "Sugestão proativa",
}

function AlertaItem({ alerta, onAbrir }: { alerta: AlertaCliente; onAbrir: () => void }) {
  const Icon = iconePorCategoria[alerta.categoria]
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
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
        <span className="hidden sm:inline">Detalhes</span>
        <ArrowRight className="h-3 w-3" />
      </span>
    </button>
  )
}

function AlertaDetalheDialog({
  alerta,
  onOpenChange,
}: {
  alerta: AlertaCliente | null
  onOpenChange: (aberto: boolean) => void
}) {
  const Icon = alerta ? iconePorCategoria[alerta.categoria] : Lightbulb
  return (
    <Dialog open={alerta !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {alerta && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                    estiloNivel[alerta.prioridade],
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="truncate text-left font-serif text-lg font-medium">
                    {alerta.clienteNome}
                  </DialogTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                        estiloNivel[alerta.prioridade],
                      )}
                    >
                      Prioridade {NIVEL_LABEL[alerta.prioridade]}
                    </span>
                    <span className="text-xs text-muted-foreground">{CATEGORIA_LABEL[alerta.categoria]}</span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <DialogDescription className="sr-only">
              Detalhes da recomendação para {alerta.clienteNome}
            </DialogDescription>

            <div className="space-y-4">
              {/* A recomendação em si — texto completo, sem truncar */}
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recomendação</p>
                <p className="mt-1.5 text-pretty text-sm leading-relaxed text-foreground">{alerta.texto}</p>
              </div>

              {/* O porquê — o raciocínio por trás da dica */}
              {alerta.motivo && (
                <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-4">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Por que isto importa</p>
                  </div>
                  <p className="mt-1.5 text-pretty text-sm leading-relaxed text-foreground/90">{alerta.motivo}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Link
                href={alerta.acaoUrl}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
              >
                {alerta.acaoLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function CentralAtencao({ alertas }: { alertas: AlertaCliente[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [expandido, setExpandido] = useState(false)
  const [regenerando, setRegenerando] = useState(false)
  const [selecionado, setSelecionado] = useState<AlertaCliente | null>(null)

  // Enriquecimento por IA: o baseline determinístico (`alertas`) aparece
  // instantaneamente e é substituído quando a análise da IA chega (com cache).
  const { data, isLoading, mutate } = useSWR(
    "central-atencao-sugestoes",
    () => carregarSugestoesAction(false),
    { revalidateOnFocus: false, fallbackData: { ok: true as const, sugestoes: alertas } },
  )

  const alertasIa = data?.ok && data.sugestoes.length > 0 ? data.sugestoes : null
  const alertasAtivos = alertasIa ?? alertas
  const enriquecido = alertasIa !== null

  async function regenerar() {
    setRegenerando(true)
    try {
      const res = await carregarSugestoesAction(true)
      if (res.ok && res.sugestoes.length > 0) {
        await mutate(res, { revalidate: false })
      }
    } finally {
      setRegenerando(false)
    }
  }

  const contagem = useMemo(
    () => ({
      todos: alertasAtivos.length,
      critico: alertasAtivos.filter((a) => a.prioridade === "critico").length,
      atencao: alertasAtivos.filter((a) => a.prioridade === "atencao").length,
      acompanhar: alertasAtivos.filter((a) => a.prioridade === "acompanhar").length,
    }),
    [alertasAtivos],
  )

  const filtrados = useMemo(
    () => (filtro === "todos" ? alertasAtivos : alertasAtivos.filter((a) => a.prioridade === filtro)),
    [alertasAtivos, filtro],
  )

  const total = alertasAtivos.length
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
            <p className="text-sm text-muted-foreground">
              {isLoading && !enriquecido
                ? "Analisando cada cliente com IA…"
                : enriquecido
                  ? "Próximas ações sugeridas por IA para cada cliente ativo."
                  : "Tudo que merece sua atenção agora."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={regenerar}
            disabled={regenerando}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3 w-3", regenerando && "animate-spin")} />
            {regenerando ? "Gerando…" : "Atualizar com IA"}
          </button>
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
              <AlertaItem
                key={`${a.clienteId}-${a.categoria}-${i}`}
                alerta={a}
                onAbrir={() => setSelecionado(a)}
              />
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

      <AlertaDetalheDialog alerta={selecionado} onOpenChange={(aberto) => !aberto && setSelecionado(null)} />
    </section>
  )
}
