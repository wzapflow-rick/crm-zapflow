"use client"

import { useActionState, useEffect, useRef, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import useSWR, { useSWRConfig } from "swr"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  LineChart,
  LinkIcon,
  MessageSquare,
  Send,
  Sparkles,
  Target,
  UploadCloud,
  Video,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type {
  Arquivo,
  Cliente,
  ConteudoItem,
  Estrategia,
  EventoCliente,
  Mensagem,
  MetricaResultado,
  Meta,
  StatusConteudo,
} from "@/lib/simple-data"
import type { Membro } from "@/lib/membros-db"
import type { EnvioCliente } from "@/lib/envios-db"
import {
  buscarMensagensPortalAction,
  enviarMensagemPortalAction,
  enviarMaterialPortalAction,
  type EstadoPortal,
} from "@/app/portal/[token]/actions"

// Chave SWR compartilhada entre a lista de mensagens e o formulário de envio do portal.
const chaveMensagensPortal = (token: string) => ["mensagens-portal", token] as const

const conteudoInfo: Record<StatusConteudo, { label: string; classe: string }> = {
  ideia: { label: "Ideia", classe: "bg-muted text-muted-foreground" },
  roteiro: { label: "Roteiro", classe: "bg-chart-3/15 text-chart-3" },
  gravacao: { label: "Gravação", classe: "bg-chart-2/15 text-chart-2" },
  edicao: { label: "Edição", classe: "bg-chart-5/15 text-chart-5" },
  aprovacao: { label: "Aprovação", classe: "bg-primary/10 text-primary" },
  publicado: { label: "Publicado", classe: "bg-chart-4/15 text-chart-4" },
}

const tipoEventoInfo: Record<string, { label: string; icon: typeof Video }> = {
  gravacao: { label: "Gravação", icon: Video },
  post: { label: "Post", icon: FileText },
  entrega: { label: "Entrega", icon: FolderOpen },
  reuniao: { label: "Reunião", icon: MessageSquare },
}

const estadoInicial: EstadoPortal = { ok: false }

// Frases de acolhimento (frase dinâmica) — escolhidas de forma estável por cliente.
const FRASES_DINAMICAS = [
  "Bom te ver novamente.",
  "Estamos preparando algo especial para esta semana.",
  "Seu crescimento é construído um conteúdo de cada vez.",
  "Essa semana o foco é fortalecer a sua autoridade.",
  "Cada detalhe está sendo cuidado pela nossa equipe.",
  "Continuamos evoluindo, lado a lado com você.",
]

// O que a SIMPLE entrega — reforço de percepção de valor.
const ENTREGAS_SIMPLE = [
  "Estratégia",
  "Planejamento",
  "Roteiros",
  "Gravações",
  "Publicações",
  "Relatórios",
  "Acompanhamento",
]

// Hash estável (determinístico) para escolher itens sem quebrar a hidratação.
function seedIndex(seed: string, tamanho: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return tamanho > 0 ? h % tamanho : 0
}

function segmentoBucket(segmento: string): "music" | "food" | "default" {
  const s = (segmento || "").toLowerCase()
  if (/(cantor|m[uú]sic|banda|artista|show|poeta|dj|audiovisual|palco)/.test(s)) return "music"
  if (/(caf[eé]|aliment|restaurante|gastr|\bbar\b|pizza|food|pet|padaria|doceria)/.test(s)) return "food"
  return "default"
}

function heroBackground(segmento: string): string {
  const bucket = segmentoBucket(segmento)
  if (bucket === "music") return "/portal/hero-music.png"
  if (bucket === "food") return "/portal/hero-food.png"
  return "/portal/hero-default.png"
}

function heroFrase(cliente: Cliente): string {
  const bucket = segmentoBucket(cliente.segmento)
  if (bucket === "music") return "Construindo uma carreira que conecta arte, presença e sentimento."
  if (bucket === "food") return "Transformando cada visita em uma experiência memorável."
  if (cliente.objetivo?.trim()) return cliente.objetivo.trim()
  return "Construindo uma marca mais forte, um passo de cada vez."
}

export function PortalCliente({
  token,
  cliente,
  membros,
  metas,
  eventos,
  conteudos,
  estrategia,
  arquivos,
  mensagens,
  resultados,
  envios,
}: {
  token: string
  cliente: Cliente
  membros: Membro[]
  metas: Meta[]
  eventos: EventoCliente[]
  conteudos: ConteudoItem[]
  estrategia: Estrategia
  arquivos: Arquivo[]
  mensagens: Mensagem[]
  resultados: MetricaResultado[]
  envios: EnvioCliente[]
}) {
  const membroPorId = (id: string) => membros.find((m) => m.id === id)
  const primeiroNome = cliente.nome.trim().split(/\s+/)[0]
  const frase = FRASES_DINAMICAS[seedIndex(cliente.id, FRASES_DINAMICAS.length)]

  // Polling: as mensagens da equipe aparecem sozinhas, sem recarregar a página.
  const { data: mensagensLive } = useSWR(
    chaveMensagensPortal(token),
    () => buscarMensagensPortalAction(token),
    { fallbackData: mensagens, refreshInterval: 5000, revalidateOnFocus: true },
  )
  const listaMensagens = mensagensLive ?? mensagens

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Cabeçalho premium */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-4 py-4 md:px-6">
          <span className="font-serif text-lg font-semibold tracking-tight text-foreground">SIMPLE</span>
          <span className="h-3.5 w-px bg-border" />
          <span className="text-sm text-muted-foreground">Portal do cliente</span>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border">
          {/* Fundo desfocado relacionado ao cliente */}
          <div
            aria-hidden
            className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl"
            style={{ backgroundImage: `url(${heroBackground(cliente.segmento)})` }}
          />
          {/* Gradiente branco para manter elegância */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background"
          />
          <div className="relative mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
            <div className="flex animate-in fade-in-50 slide-in-from-bottom-2 flex-col items-start gap-5 duration-500 sm:flex-row sm:items-center sm:gap-6">
              <Avatar className="h-20 w-20 shrink-0 ring-4 ring-background shadow-sm sm:h-24 sm:w-24">
                {cliente.logoUrl && (
                  <AvatarImage src={cliente.logoUrl || "/placeholder.svg"} alt={cliente.nome} className="object-cover" />
                )}
                <AvatarFallback className={cn(cliente.cor, "text-2xl font-semibold text-primary-foreground")}>
                  {cliente.iniciais}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-pretty text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {cliente.nome}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {cliente.segmento} · em parceria desde {cliente.desde}
                </p>
                <p className="mt-4 max-w-xl text-balance text-base leading-relaxed text-foreground/90 sm:text-lg">
                  {heroFrase(cliente)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
          {/* FRASE DINÂMICA */}
          <div className="flex items-center gap-2 animate-in fade-in-50 duration-700">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-pretty text-sm font-medium text-foreground">
              {frase} <span className="text-muted-foreground">Que bom ter você aqui, {primeiroNome}.</span>
            </p>
          </div>

          {/* RESUMO RÁPIDO */}
          <ResumoRapido metas={metas} eventos={eventos} conteudos={conteudos} resultados={resultados} />

          {/* MENU + CONTEÚDO */}
          <Tabs defaultValue="mensagens" className="mt-8">
            <TabsList className="-mx-4 flex h-auto w-[calc(100%+2rem)] justify-start gap-1.5 overflow-x-auto whitespace-nowrap rounded-none border-b border-border bg-transparent px-4 pb-0 pt-0 [scrollbar-width:none] md:mx-0 md:w-full md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
              <TabTrigger value="mensagens" icon={MessageSquare} label="Mensagens" />
              <TabTrigger value="conteudo" icon={Video} label="Conteúdo" />
              <TabTrigger value="calendario" icon={CalendarDays} label="Agenda" />
              <TabTrigger value="resultados" icon={ArrowUpRight} label="Resultados" />
              <TabTrigger value="materiais" icon={FolderOpen} label="Materiais" />
              <TabTrigger value="estrategia" icon={LineChart} label="Estratégia" />
              <TabTrigger value="visao" icon={Target} label="Metas" />
            </TabsList>

            {/* Mensagens */}
            <TabsContent
              value="mensagens"
              className="mt-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
            >
              <Card titulo="Converse com a SIMPLE" subtitulo="Uma equipe dedicada acompanhando você de perto.">
                <FormMensagem token={token} />
                <ul className="mt-6 space-y-4">
                  {/* Mensagem automática de boas-vindas quando ainda não há histórico */}
                  {listaMensagens.length === 0 && (
                    <li className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
                          S
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-muted/40 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">Equipe SIMPLE</span>
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Automática
                          </span>
                        </div>
                        <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                          Olá, {primeiroNome}! Este é o seu espaço exclusivo com a SIMPLE. Já estamos cuidando da sua
                          estratégia e traremos novidades por aqui. Sempre que precisar, é só escrever — a gente
                          responde por este canal.
                        </p>
                      </div>
                    </li>
                  )}
                  {listaMensagens.map((m) => {
                    const autor = membroPorId(m.autorId)
                    const nome = m.deCliente ? m.autorNome || cliente.nome : autor?.nome ?? "Equipe SIMPLE"
                    const iniciais = m.deCliente ? cliente.iniciais : autor?.iniciais ?? "S"
                    const cor = m.deCliente ? cliente.cor : autor?.cor ?? "bg-primary"
                    return (
                      <li key={m.id} className={cn("flex gap-3", m.deCliente && "flex-row-reverse")}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={cn(cor, "text-[10px] text-primary-foreground")}>
                            {iniciais}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "min-w-0 flex-1 rounded-2xl border border-border px-4 py-3",
                            m.deCliente ? "rounded-tr-sm bg-primary/5" : "rounded-tl-sm bg-muted/40",
                          )}
                        >
                          <div className={cn("flex items-center gap-2", m.deCliente && "flex-row-reverse")}>
                            <span className="text-sm font-medium text-foreground">{nome}</span>
                            {m.deCliente && (
                              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                Você
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">{m.data}</span>
                          </div>
                          <p
                            className={cn(
                              "mt-1 text-pretty text-sm leading-relaxed text-muted-foreground",
                              m.deCliente && "text-right",
                            )}
                          >
                            {m.texto}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </TabsContent>

            {/* Conteúdo */}
            <TabsContent
              value="conteudo"
              className="mt-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
            >
              <Card titulo="Conteúdo em produção" subtitulo="Acompanhe cada peça saindo do papel.">
                {conteudos.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {conteudos.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{c.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.formato} · {c.data}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            conteudoInfo[c.status].classe,
                          )}
                        >
                          {conteudoInfo[c.status].label}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Vazio texto="Nenhum conteúdo em produção no momento." />
                )}
              </Card>
            </TabsContent>

            {/* Agenda */}
            <TabsContent
              value="calendario"
              className="mt-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
            >
              <Card titulo="Próximas entregas e gravações" subtitulo="Tudo o que vem por aí, em um só lugar.">
                {eventos.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {eventos.map((e) => {
                      const info = tipoEventoInfo[e.tipo]
                      const Icon = info?.icon ?? CalendarDays
                      return (
                        <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{e.titulo}</p>
                            <p className="text-xs text-muted-foreground">{info?.label ?? "Agenda"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-foreground">{e.data}</p>
                            <p className="text-[11px] text-muted-foreground">{e.hora}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <Vazio texto="Nenhuma entrega agendada no momento." />
                )}
              </Card>
            </TabsContent>

            {/* Resultados */}
            <TabsContent
              value="resultados"
              className="mt-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
            >
              {resultados.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {resultados.map((r) => {
                    const positivo = r.variacao >= 0
                    return (
                      <div
                        key={r.id ?? r.rotulo}
                        className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
                      >
                        <p className="text-sm text-muted-foreground">{r.rotulo}</p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{r.valor}</p>
                        {r.variacao !== 0 && (
                          <p
                            className={cn(
                              "mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium",
                              positivo ? "text-chart-4" : "text-destructive",
                            )}
                          >
                            {positivo ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(r.variacao)}% vs. mês anterior
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Card titulo="Resultados">
                  <Vazio texto="Os resultados aparecerão aqui assim que a primeira medição estiver pronta." />
                </Card>
              )}
            </TabsContent>

            {/* Materiais */}
            <TabsContent
              value="materiais"
              className="mt-6 space-y-4 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
            >
              <Card titulo="Enviar vídeos e fotos" subtitulo="Cole o link do seu material — sem limite de tamanho.">
                <FormEnvio token={token} />
                {envios.length > 0 && (
                  <ul className="mt-6 divide-y divide-border">
                    {envios.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <LinkIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{e.titulo}</p>
                          {e.descricao && <p className="truncate text-xs text-muted-foreground">{e.descricao}</p>}
                        </div>
                        <a
                          href={e.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Abrir
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card titulo="Materiais e arquivos" subtitulo="Tudo o que a SIMPLE preparou para você.">
                {arquivos.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {arquivos.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                          <FolderOpen className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{a.nome}</p>
                          <p className="text-xs text-muted-foreground">{a.tipo}</p>
                        </div>
                        {a.url ? (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Baixar / Abrir
                          </a>
                        ) : (
                          <span className="shrink-0 text-xs text-muted-foreground">Em breve</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Vazio texto="Nenhum material disponível ainda." />
                )}
              </Card>
            </TabsContent>

            {/* Estratégia */}
            <TabsContent
              value="estrategia"
              className="mt-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card titulo="Plano atual" subtitulo="A direção que estamos seguindo juntos.">
                  {estrategia.estrategiaAtual.length > 0 ? (
                    <ul className="space-y-2.5">
                      {estrategia.estrategiaAtual.map((item, i) => (
                        <li key={i} className="flex gap-2.5 text-sm leading-snug text-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Vazio texto="Plano em definição com o time." />
                  )}
                </Card>
                <Card titulo="Insights" subtitulo="O que os dados estão nos mostrando.">
                  {estrategia.insights.length > 0 ? (
                    <ul className="space-y-2.5">
                      {estrategia.insights.map((item, i) => (
                        <li key={i} className="flex gap-2.5 text-sm leading-snug text-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-2" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Vazio texto="Insights aparecerão conforme os dados chegarem." />
                  )}
                </Card>
              </div>
            </TabsContent>

            {/* Metas */}
            <TabsContent
              value="visao"
              className="mt-6 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
            >
              <Card titulo="Suas metas com a SIMPLE" subtitulo="O crescimento que estamos construindo.">
                {metas.length > 0 ? (
                  <ul className="space-y-4">
                    {metas.map((m) => {
                      const pct = m.alvo > 0 ? Math.min(100, Math.round((m.atual / m.alvo) * 100)) : 0
                      return (
                        <li key={m.id}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{m.rotulo}</span>
                            <span className="font-medium text-foreground">{pct}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <Vazio texto="Metas em definição com o time." />
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {/* DIÁRIO DA PARCERIA + O QUE ESTAMOS FAZENDO */}
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DiarioParceria cliente={cliente} eventos={eventos} />
            <Card titulo="O que estamos fazendo por você" subtitulo="Cuidamos de cada etapa da sua presença.">
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {ENTREGAS_SIMPLE.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-chart-4/15 text-chart-4">
                      <Check className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Este é um espaço privado entre você e a SIMPLE. Não compartilhe este link.
          </p>
        </div>
      </main>
    </div>
  )
}

// ── Resumo rápido (cards vivos) ──────────────────────────────────────────────

type StatusResumo = "ok" | "atencao" | "urgente" | "neutro"

const statusDot: Record<StatusResumo, string> = {
  ok: "bg-chart-4",
  atencao: "bg-chart-2",
  urgente: "bg-destructive",
  neutro: "bg-muted-foreground/40",
}

function ResumoRapido({
  metas,
  eventos,
  conteudos,
  resultados,
}: {
  metas: Meta[]
  eventos: EventoCliente[]
  conteudos: ConteudoItem[]
  resultados: MetricaResultado[]
}) {
  const progressoMetas =
    metas.length > 0
      ? Math.round(
          metas.reduce((acc, m) => acc + (m.alvo > 0 ? Math.min(100, (m.atual / m.alvo) * 100) : 0), 0) / metas.length,
        )
      : null

  const hoje = new Date().toISOString().slice(0, 10)
  const proximoEvento =
    eventos.filter((e) => e.dataISO && e.dataISO >= hoje).sort((a, b) => (a.dataISO! < b.dataISO! ? -1 : 1))[0] ?? null

  const aguardando = conteudos.filter((c) => c.status === "aprovacao")
  const ultimoResultado = resultados[0] ?? null

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 animate-in fade-in-50 slide-in-from-bottom-2 duration-500 sm:grid-cols-2 lg:grid-cols-4">
      {/* Próximo compromisso */}
      <ResumoCard
        icon={CalendarDays}
        rotulo="Próximo compromisso"
        status={proximoEvento ? "ok" : "neutro"}
      >
        {proximoEvento ? (
          <>
            <p className="truncate text-sm font-semibold text-foreground">{proximoEvento.titulo}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {proximoEvento.data}
              {proximoEvento.hora ? ` · ${proximoEvento.hora}` : ""}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {tipoEventoInfo[proximoEvento.tipo]?.label ?? "Agenda"}
            </p>
          </>
        ) : (
          <ResumoVazio texto="Nada agendado" />
        )}
      </ResumoCard>

      {/* Meta atual */}
      <ResumoCard
        icon={Target}
        rotulo="Meta atual"
        status={progressoMetas === null ? "neutro" : progressoMetas >= 60 ? "ok" : "atencao"}
      >
        {progressoMetas !== null ? (
          <>
            <p className="truncate text-sm font-semibold text-foreground">{metas[0]?.rotulo ?? "Progresso geral"}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700"
                style={{ width: `${progressoMetas}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{progressoMetas}% concluído</p>
          </>
        ) : (
          <ResumoVazio texto="Metas em definição" />
        )}
      </ResumoCard>

      {/* Último resultado */}
      <ResumoCard
        icon={ArrowUpRight}
        rotulo="Último resultado"
        status={ultimoResultado ? (ultimoResultado.variacao >= 0 ? "ok" : "atencao") : "neutro"}
      >
        {ultimoResultado ? (
          <>
            <p className="truncate text-xs text-muted-foreground">{ultimoResultado.rotulo}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{ultimoResultado.valor}</p>
            {ultimoResultado.variacao !== 0 && (
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-0.5 text-xs font-medium",
                  ultimoResultado.variacao >= 0 ? "text-chart-4" : "text-destructive",
                )}
              >
                {ultimoResultado.variacao >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(ultimoResultado.variacao)}% vs. mês anterior
              </p>
            )}
          </>
        ) : (
          <ResumoVazio texto="Sem medições ainda" />
        )}
      </ResumoCard>

      {/* Pendências */}
      <ResumoCard
        icon={aguardando.length > 0 ? Clock : CheckCircle2}
        rotulo={aguardando.length > 0 ? "Aguardando você" : "Tudo em dia"}
        status={aguardando.length > 0 ? "atencao" : "ok"}
      >
        {aguardando.length > 0 ? (
          <>
            <p className="text-xl font-semibold tracking-tight text-foreground">{aguardando.length}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {aguardando.length === 1 ? "conteúdo para aprovar" : "conteúdos para aprovar"}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-chart-4">Nenhuma pendência</p>
            <p className="mt-1.5 text-xs text-muted-foreground">Está tudo sob controle</p>
          </>
        )}
      </ResumoCard>
    </div>
  )
}

function ResumoCard({
  icon: Icon,
  rotulo,
  status,
  children,
}: {
  icon: typeof Target
  rotulo: string
  status: StatusResumo
  children: ReactNode
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {rotulo}
        </div>
        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[status])} aria-hidden />
      </div>
      {children}
    </div>
  )
}

function ResumoVazio({ texto }: { texto: string }) {
  return <p className="py-1 text-sm text-muted-foreground">{texto}</p>
}

// ── Diário da parceria (timeline) ────────────────────────────────────────────

function DiarioParceria({ cliente, eventos }: { cliente: Cliente; eventos: EventoCliente[] }) {
  const hoje = new Date().toISOString().slice(0, 10)
  const passados = eventos
    .filter((e) => e.dataISO && e.dataISO <= hoje)
    .sort((a, b) => (a.dataISO! < b.dataISO! ? -1 : 1))
    .slice(-5)

  const marcos: { quando: string; titulo: string }[] = [
    { quando: cliente.desde, titulo: "Parceria iniciada" },
    ...passados.map((e) => ({ quando: e.data, titulo: e.titulo })),
  ]

  return (
    <Card titulo="Diário da parceria" subtitulo="A história que estamos construindo juntos.">
      <ol className="relative space-y-5 border-l border-border pl-5">
        {marcos.map((m, i) => (
          <li key={i} className="relative">
            <span
              className={cn(
                "absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card",
                i === marcos.length - 1 ? "bg-primary" : "bg-border",
              )}
              aria-hidden
            />
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{m.quando}</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{m.titulo}</p>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// ── Formulários ──────────────────────────────────────────────────────────────

function BotaoEnviar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="group gap-1.5 transition-transform active:scale-95">
      <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      {pending ? "Enviando..." : "Enviar"}
    </Button>
  )
}

function BotaoEnviarMaterial() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="group gap-1.5 transition-transform active:scale-95">
      <UploadCloud className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
      {pending ? "Enviando..." : "Enviar link"}
    </Button>
  )
}

function FormEnvio({ token }: { token: string }) {
  const [estado, formAction] = useActionState(enviarMaterialPortalAction, estadoInicial)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [estado, router])

  return (
    <form ref={formRef} action={formAction} className="grid gap-3">
      <input type="hidden" name="token" value={token} />
      <Input
        name="link"
        type="url"
        inputMode="url"
        placeholder="Cole o link aqui (ex: drive.google.com/...)"
        required
        aria-label="Link do material"
      />
      <Input name="titulo" placeholder="Título (ex: Bastidores da gravação - Maio)" aria-label="Título do material" />
      <Textarea name="descricao" placeholder="Observações para a equipe (opcional)" rows={2} aria-label="Observações" />
      {estado.erro && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{estado.erro}</p>}
      <div className="flex justify-end">
        <BotaoEnviarMaterial />
      </div>
    </form>
  )
}

function FormMensagem({ token }: { token: string }) {
  const [estado, formAction] = useActionState(enviarMensagemPortalAction, estadoInicial)
  const formRef = useRef<HTMLFormElement>(null)
  const { mutate } = useSWRConfig()

  useEffect(() => {
    if (estado.ok) {
      formRef.current?.reset()
      mutate(chaveMensagensPortal(token)) // atualiza a lista de mensagens na hora
    }
  }, [estado, mutate, token])

  return (
    <form ref={formRef} action={formAction} className="grid gap-3">
      <input type="hidden" name="token" value={token} />
      <Textarea
        name="texto"
        placeholder="Escreva uma mensagem para o time da SIMPLE..."
        rows={3}
        required
        aria-label="Mensagem para a SIMPLE"
      />
      {estado.erro && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{estado.erro}</p>}
      <div className="flex justify-end">
        <BotaoEnviar />
      </div>
    </form>
  )
}

function TabTrigger({ value, icon: Icon, label }: { value: string; icon: typeof Target; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="relative shrink-0 gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </TabsTrigger>
  )
}

function Card({
  titulo,
  subtitulo,
  children,
  className,
}: {
  titulo: string
  subtitulo?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
        {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>}
      </div>
      {children}
    </div>
  )
}

function Vazio({ texto }: { texto: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{texto}</p>
}
