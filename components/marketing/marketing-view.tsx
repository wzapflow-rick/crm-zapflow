"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ListChecks, Clock, AtSign, Loader2, Brain } from "lucide-react"
import { gerarInsightsAction, type EstadoInsights } from "@/app/(crm)/marketing/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ChatEstrategico, type ClienteOpcao } from "@/components/marketing/chat-estrategico"

const estadoInicial: EstadoInsights = { ok: false }

type Aba = "chat" | "insights"

export function MarketingView({ clientes }: { clientes: ClienteOpcao[] }) {
  const [aba, setAba] = useState<Aba>("chat")

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-5">
        <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Marketing</h1>
        <p className="mt-1 text-pretty text-sm text-muted-foreground">
          Inteligência de marketing da SIMPLE OS: converse com a IA que conhece cada cliente a fundo e gere insights de
          perfil sob demanda.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-xl border border-border bg-card p-1">
        <BotaoAba ativo={aba === "chat"} onClick={() => setAba("chat")} icon={<Brain className="h-4 w-4" />}>
          Chat estratégico
        </BotaoAba>
        <BotaoAba ativo={aba === "insights"} onClick={() => setAba("insights")} icon={<AtSign className="h-4 w-4" />}>
          Insights de Instagram
        </BotaoAba>
      </div>

      {aba === "chat" ? <ChatEstrategico clientes={clientes} /> : <InsightsInstagram />}
    </div>
  )
}

function BotaoAba({
  ativo,
  onClick,
  icon,
  children,
}: {
  ativo: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
        ativo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function BotaoGerar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analisando perfil...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Gerar insights com IA
        </>
      )}
    </Button>
  )
}

function InsightsInstagram() {
  const [estado, formAction] = useActionState(gerarInsightsAction, estadoInicial)

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Formulário de entrada */}
        <form action={formAction} className="h-fit rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AtSign className="h-4 w-4" />
            </span>
            <h2 className="font-medium text-foreground">Dados do perfil</h2>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="perfil">@ do perfil *</Label>
              <Input id="perfil" name="perfil" placeholder="@clinicaaurora" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nicho">Nicho / segmento *</Label>
              <Input id="nicho" name="nicho" placeholder="Clínica de estética" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="seguidores">Seguidores</Label>
                <Input id="seguidores" name="seguidores" placeholder="12.400" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="alcance">Alcance/post</Label>
                <Input id="alcance" name="alcance" placeholder="3.200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="engajamento">Engajamento</Label>
                <Input id="engajamento" name="engajamento" placeholder="2,8%" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="frequencia">Frequência</Label>
                <Input id="frequencia" name="frequencia" placeholder="4 posts/semana" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="objetivo">Objetivo principal</Label>
              <Input id="objetivo" name="objetivo" placeholder="Gerar agendamentos" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="posts">Desempenho dos últimos posts</Label>
              <Textarea
                id="posts"
                name="posts"
                rows={4}
                placeholder="Ex.: Reel de bastidores teve 18 mil views; carrossel de dicas teve 320 curtidas; stories com enquete tiveram boa resposta..."
              />
            </div>
            <BotaoGerar />
            <p className="text-xs text-muted-foreground">
              Os dados são enviados para a OpenAI apenas para gerar a análise.
            </p>
          </div>
        </form>

        {/* Resultado */}
        <div className="min-w-0">
          {estado.erro && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {estado.erro}
            </div>
          )}

          {!estado.insights && !estado.erro && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </span>
              <p className="font-medium text-foreground">Os insights aparecem aqui</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Preencha os dados do perfil ao lado e clique em &quot;Gerar insights com IA&quot;.
              </p>
            </div>
          )}

          {estado.insights && <Insights data={estado.insights} />}
        </div>
      </div>
    </div>
  )
}

function Insights({ data }: { data: NonNullable<EstadoInsights["insights"]> }) {
  return (
    <div className="grid gap-4">
      <Bloco icone={<Sparkles className="h-4 w-4" />} titulo="Diagnóstico">
        <p className="text-sm leading-relaxed text-foreground">{data.resumo}</p>
      </Bloco>

      <div className="grid gap-4 md:grid-cols-2">
        <Bloco icone={<TrendingUp className="h-4 w-4" />} titulo="Pontos fortes" cor="text-emerald-500">
          <ListaSimples itens={data.pontosFortes} />
        </Bloco>
        <Bloco icone={<AlertTriangle className="h-4 w-4" />} titulo="Pontos de atenção" cor="text-amber-500">
          <ListaSimples itens={data.pontosAtencao} />
        </Bloco>
      </div>

      <Bloco icone={<Lightbulb className="h-4 w-4" />} titulo="Ideias de conteúdo">
        <div className="grid gap-2.5">
          {data.ideiasConteudo.map((ideia, i) => (
            <div key={i} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{ideia.titulo}</p>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {ideia.formato}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ideia.porque}</p>
            </div>
          ))}
        </div>
      </Bloco>

      <div className="grid gap-4 md:grid-cols-2">
        <Bloco icone={<ListChecks className="h-4 w-4" />} titulo="Recomendações">
          <ListaSimples itens={data.recomendacoes} numerada />
        </Bloco>
        <Bloco icone={<Clock className="h-4 w-4" />} titulo="Melhores horários">
          <p className="text-sm leading-relaxed text-foreground">{data.melhoresHorarios}</p>
        </Bloco>
      </div>
    </div>
  )
}

function Bloco({
  icone,
  titulo,
  cor = "text-primary",
  children,
}: {
  icone: React.ReactNode
  titulo: string
  cor?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-muted ${cor}`}>{icone}</span>
        <h3 className="font-medium text-foreground">{titulo}</h3>
      </div>
      {children}
    </div>
  )
}

function ListaSimples({ itens, numerada = false }: { itens: string[]; numerada?: boolean }) {
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
