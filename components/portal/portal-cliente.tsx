"use client"

import { useActionState, useEffect, useRef, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  FileText,
  FolderOpen,
  LineChart,
  MessageSquare,
  Send,
  Target,
  Video,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
import { enviarMensagemPortalAction, type EstadoPortal } from "@/app/portal/[token]/actions"

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
}) {
  const membroPorId = (id: string) => membros.find((m) => m.id === id)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Cabeçalho do portal */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 md:px-6">
          <span className="font-serif text-lg font-semibold tracking-tight text-foreground">SIMPLE</span>
          <span className="text-sm text-muted-foreground">· Portal do cliente</span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
          {/* Identificação do cliente */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
            <Avatar className="h-14 w-14">
              <AvatarFallback className={cn(cliente.cor, "text-lg font-semibold text-primary-foreground")}>
                {cliente.iniciais}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{cliente.nome}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {cliente.segmento} · cliente desde {cliente.desde}
              </p>
            </div>
          </div>

          {cliente.objetivo && (
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">{cliente.objetivo}</p>
          )}

          <Tabs defaultValue="mensagens" className="mt-6">
            <TabsList className="-mx-4 flex h-auto w-[calc(100%+2rem)] justify-start gap-1 overflow-x-auto whitespace-nowrap bg-transparent px-4 py-0 [scrollbar-width:none] md:mx-0 md:w-full md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
              <TabTrigger value="mensagens" icon={MessageSquare} label="Mensagens" />
              <TabTrigger value="materiais" icon={FolderOpen} label="Materiais" />
              <TabTrigger value="calendario" icon={CalendarDays} label="Calendário" />
              <TabTrigger value="conteudo" icon={Video} label="Conteúdo" />
              <TabTrigger value="resultados" icon={ArrowUpRight} label="Resultados" />
              <TabTrigger value="estrategia" icon={LineChart} label="Estratégia" />
              <TabTrigger value="visao" icon={Target} label="Metas" />
            </TabsList>

            {/* Mensagens — única aba com ação de escrita */}
            <TabsContent value="mensagens" className="mt-5">
              <Card titulo="Converse com a SIMPLE">
                <FormMensagem token={token} />
                {mensagens.length > 0 ? (
                  <ul className="mt-6 space-y-4">
                    {mensagens.map((m) => {
                      const autor = membroPorId(m.autorId)
                      const nome = m.deCliente ? m.autorNome || cliente.nome : autor?.nome ?? "SIMPLE"
                      const iniciais = m.deCliente ? cliente.iniciais : autor?.iniciais ?? "S"
                      const cor = m.deCliente ? cliente.cor : autor?.cor ?? "bg-primary"
                      return (
                        <li key={m.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className={cn(cor, "text-[10px] text-primary-foreground")}>
                              {iniciais}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{nome}</span>
                              {m.deCliente && (
                                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                  Você
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground">{m.data}</span>
                            </div>
                            <p className="mt-0.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                              {m.texto}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <Vazio texto="Nenhuma mensagem ainda. Escreva acima para falar com o time." />
                )}
              </Card>
            </TabsContent>

            {/* Materiais — única outra ação: baixar */}
            <TabsContent value="materiais" className="mt-5">
              <Card titulo="Materiais e arquivos">
                {arquivos.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {arquivos.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
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
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
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

            {/* Calendário (leitura) */}
            <TabsContent value="calendario" className="mt-5">
              <Card titulo="Próximas entregas e gravações">
                {eventos.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {eventos.map((e) => {
                      const info = tipoEventoInfo[e.tipo]
                      const Icon = info.icon
                      return (
                        <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{e.titulo}</p>
                            <p className="text-xs text-muted-foreground">{info.label}</p>
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

            {/* Conteúdo (leitura) */}
            <TabsContent value="conteudo" className="mt-5">
              <Card titulo="Conteúdo em produção">
                {conteudos.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {conteudos.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{c.titulo}</p>
                          <p className="text-xs text-muted-foreground">{c.formato} · {c.data}</p>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", conteudoInfo[c.status].classe)}>
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

            {/* Resultados (leitura) */}
            <TabsContent value="resultados" className="mt-5">
              {resultados.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {resultados.map((r) => {
                    const positivo = r.variacao >= 0
                    return (
                      <div key={r.id ?? r.rotulo} className="rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">{r.rotulo}</p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{r.valor}</p>
                        {r.variacao !== 0 && (
                          <p className={cn("mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium", positivo ? "text-chart-4" : "text-destructive")}>
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

            {/* Estratégia (leitura) */}
            <TabsContent value="estrategia" className="mt-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card titulo="Plano atual">
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
                <Card titulo="Insights">
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

            {/* Metas (leitura) */}
            <TabsContent value="visao" className="mt-5">
              <Card titulo="Suas metas com a SIMPLE">
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
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
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

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Este é um espaço privado entre você e a SIMPLE. Não compartilhe este link.
          </p>
        </div>
      </main>
    </div>
  )
}

function BotaoEnviar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="gap-1.5">
      <Send className="h-3.5 w-3.5" />
      {pending ? "Enviando..." : "Enviar"}
    </Button>
  )
}

function FormMensagem({ token }: { token: string }) {
  const [estado, formAction] = useActionState(enviarMensagemPortalAction, estadoInicial)
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
      <Textarea
        name="texto"
        placeholder="Escreva uma mensagem para o time da SIMPLE..."
        rows={3}
        required
        aria-label="Mensagem para a SIMPLE"
      />
      {estado.erro && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{estado.erro}</p>
      )}
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
      className="shrink-0 gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </TabsTrigger>
  )
}

function Card({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{titulo}</h3>
      {children}
    </div>
  )
}

function Vazio({ texto }: { texto: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{texto}</p>
}
