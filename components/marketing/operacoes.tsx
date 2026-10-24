"use client"

import { useActionState, useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import {
  FlaskConical,
  Loader2,
  Sparkles,
  Plus,
  Trophy,
  Lightbulb,
  ListChecks,
  Trash2,
  BarChart3,
  Beaker,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  criarOperacaoAction,
  excluirOperacaoAction,
  type EstadoOperacao,
} from "@/app/(crm)/marketing/operacoes-actions"
import type { Operacao, StatusOperacao } from "@/lib/operacoes-db"

const estadoInicial: EstadoOperacao = { ok: false }

const statusInfo: Record<StatusOperacao, { label: string; classe: string }> = {
  planejamento: { label: "Planejamento", classe: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", classe: "bg-chart-3/15 text-chart-3" },
  concluida: { label: "Concluída", classe: "bg-chart-4/15 text-chart-4" },
}

const EXEMPLO =
  "Ex.: OPERAÇÃO GANCHO. Objetivo: descobrir qual tipo de abertura retém mais.\n" +
  "Testamos 5 ganchos no MESMO conteúdo (curiosidade, promessa, descoberta, alerta, contraste).\n" +
  "Métricas: views, retenção, % não seguidores, curtidas, comentários, compartilhamentos, salvamentos, visitas ao perfil.\n" +
  "Resultados: o gancho de 'contraste' teve 42% mais retenção e o dobro de salvamentos..."

export function Operacoes({ operacoes }: { operacoes: Operacao[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [estado, formAction] = useActionState(async (prev: EstadoOperacao, fd: FormData) => {
    const r = await criarOperacaoAction(prev, fd)
    if (r.ok) {
      setAberto(false)
      router.refresh()
    }
    return r
  }, estadoInicial)

  return (
    <div>
      {/* Faixa explicativa + ação */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Operações da SIMPLE</p>
            <p className="text-pretty text-sm text-muted-foreground">
              Testes reais e controlados da agência. Cole tudo que foi colhido — a IA organiza, guarda na memória e{" "}
              <strong>usa esses dados para recomendar roteiros</strong> em vez de achismos.
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAberto((v) => !v)}>
          {aberto ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {aberto ? "Cancelar" : "Nova operação"}
        </Button>
      </div>

      {/* Formulário: aba de texto para colar as informações da operação */}
      {aberto && (
        <form action={formAction} className="mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Beaker className="h-4 w-4" />
            </span>
            <h2 className="font-medium text-foreground">Registrar operação</h2>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="titulo">Título (opcional — a IA sugere se deixar vazio)</Label>
              <Input id="titulo" name="titulo" placeholder="Operação Gancho" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dados">Informações colhidas da operação *</Label>
              <Textarea
                id="dados"
                name="dados"
                rows={10}
                required
                placeholder={EXEMPLO}
                className="resize-y font-mono text-[13px] leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                Pode colar o planejamento (sem dados ainda) ou os resultados já coletados. A IA identifica o estágio,
                extrai o vencedor e os aprendizados — nunca inventa resultados.
              </p>
            </div>

            {estado.erro && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{estado.erro}</p>
            )}

            <BotaoSalvar />
          </div>
        </form>
      )}

      {/* Lista de operações */}
      {operacoes.length > 0 ? (
        <div className="space-y-4">
          {operacoes.map((op) => (
            <CardOperacao key={op.id} operacao={op} />
          ))}
        </div>
      ) : (
        !aberto && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-foreground">Nenhuma operação ainda</p>
            <p className="mx-auto mt-1 max-w-md text-pretty text-sm text-muted-foreground">
              Comece registrando sua primeira operação. Cada teste vira dado real que a SIMPLE OS usa para orientar os
              conteúdos dos clientes.
            </p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setAberto(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nova operação
            </Button>
          </div>
        )
      )}
    </div>
  )
}

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Organizando com IA...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Organizar e salvar na memória
        </>
      )}
    </Button>
  )
}

function CardOperacao({ operacao: op }: { operacao: Operacao }) {
  const router = useRouter()
  const [excluindo, startExcluir] = useTransition()
  const info = statusInfo[op.status]

  function excluir() {
    startExcluir(async () => {
      await excluirOperacaoAction(op.id)
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-pretty font-medium text-foreground">{op.titulo}</h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", info.classe)}>{info.label}</span>
          </div>
          {op.objetivo && <p className="mt-1 text-pretty text-sm text-muted-foreground">{op.objetivo}</p>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={excluir}
          disabled={excluindo}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          {excluindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          <span className="sr-only">Excluir operação</span>
        </Button>
      </div>

      {op.resumo && <p className="mt-3 text-pretty text-sm leading-relaxed text-foreground">{op.resumo}</p>}

      {/* Vencedor em destaque */}
      {op.vencedor && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-chart-4/30 bg-chart-4/5 p-3">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-chart-4" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-chart-4">Vencedor</p>
            <p className="mt-0.5 text-pretty text-sm leading-relaxed text-foreground">{op.vencedor}</p>
          </div>
        </div>
      )}

      {/* Metodologia + chips de variações/métricas */}
      {(op.variacoes.length > 0 || op.metricas.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {op.variacoes.length > 0 && (
            <ChipGroup icone={<Beaker className="h-3.5 w-3.5" />} titulo="Variações testadas" itens={op.variacoes} />
          )}
          {op.metricas.length > 0 && (
            <ChipGroup icone={<BarChart3 className="h-3.5 w-3.5" />} titulo="Métricas" itens={op.metricas} />
          )}
        </div>
      )}

      {op.metodologia && (
        <p className="mt-3 rounded-lg bg-muted p-2.5 text-pretty text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Metodologia: </span>
          {op.metodologia}
        </p>
      )}

      {/* Aprendizados + recomendações */}
      {(op.aprendizados.length > 0 || op.recomendacoes.length > 0) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {op.aprendizados.length > 0 && (
            <Bloco icone={<Lightbulb className="h-4 w-4" />} titulo="Aprendizados">
              <Lista itens={op.aprendizados} />
            </Bloco>
          )}
          {op.recomendacoes.length > 0 && (
            <Bloco icone={<ListChecks className="h-4 w-4" />} titulo="Recomendações para conteúdo">
              <Lista itens={op.recomendacoes} numerada />
            </Bloco>
          )}
        </div>
      )}
    </div>
  )
}

function ChipGroup({ icone, titulo, itens }: { icone: React.ReactNode; titulo: string; itens: string[] }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icone}
        {titulo}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {itens.map((i, idx) => (
          <span key={idx} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {i}
          </span>
        ))}
      </div>
    </div>
  )
}

function Bloco({
  icone,
  titulo,
  children,
}: {
  icone: React.ReactNode
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">{icone}</span>
        <h4 className="text-sm font-medium text-foreground">{titulo}</h4>
      </div>
      {children}
    </div>
  )
}

function Lista({ itens, numerada = false }: { itens: string[]; numerada?: boolean }) {
  return (
    <ul className="grid gap-2">
      {itens.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-foreground">
          {numerada ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {i + 1}
            </span>
          ) : (
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          )}
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}
