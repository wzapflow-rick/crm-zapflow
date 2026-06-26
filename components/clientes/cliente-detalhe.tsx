"use client"

import Link from "next/link"
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  FileText,
  FolderOpen,
  LineChart,
  MessageSquare,
  Pencil,
  Phone,
  Target,
  Video,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  detalheClientePorId,
  type Arquivo,
  type Cliente,
  type ConteudoItem,
  type Estrategia,
  type EventoCliente,
  type Mensagem,
  type MetricaResultado,
  type Meta,
  type StatusConteudo,
} from "@/lib/simple-data"
import type { Membro } from "@/lib/membros-db"
import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog"
import { VisaoGeralDialog } from "@/components/clientes/visao-geral-dialog"
import { CalendarioDialog } from "@/components/clientes/calendario-dialog"
import { ConteudoDialog } from "@/components/clientes/conteudo-dialog"
import { EstrategiaDialog } from "@/components/clientes/estrategia-dialog"
import { ArquivosDialog } from "@/components/clientes/arquivos-dialog"
import { ComunicacaoDialog } from "@/components/clientes/comunicacao-dialog"
import { ResultadosDialog } from "@/components/clientes/resultados-dialog"
import { PortalLink } from "@/components/clientes/portal-link"
import { ExcluirClienteButton } from "@/components/clientes/excluir-cliente-button"
import { atualizarClienteAction } from "@/app/(crm)/clientes/actions"

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

const statusClienteInfo: Record<Cliente["status"], { label: string; classe: string }> = {
  ativo: { label: "Ativo", classe: "bg-chart-4/15 text-chart-4" },
  onboarding: { label: "Onboarding", classe: "bg-primary/10 text-primary" },
  pausado: { label: "Pausado", classe: "bg-muted text-muted-foreground" },
}

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

export function ClienteDetalhe({
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
  const resp = membros.find((m) => m.id === cliente.responsavelId)
  const membroPorId = (id: string) => membros.find((m) => m.id === id)
  const detalhe = detalheClientePorId(cliente.id)

  // Usa dados reais do banco; sem dados ainda, mostra estado vazio editável.
  const resumo = cliente.resumoEstrategico?.trim() || ""

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Link>

        {/* Cabeçalho do cliente */}
        <div className="mt-4 flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:p-6">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
            <AvatarFallback className={cn(cliente.cor, "text-xl font-semibold text-primary-foreground")}>
              {cliente.iniciais}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {cliente.nome}
              </h2>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusClienteInfo[cliente.status].classe)}>
                {statusClienteInfo[cliente.status].label}
              </span>
              <ClienteFormDialog
                membros={membros}
                cliente={cliente}
                acao={atualizarClienteAction}
                titulo="Editar cliente"
                descricao="Atualize as informações do cliente. As mudanças são salvas no banco da SIMPLE."
                textoBotao="Salvar alterações"
                trigger={
                  <Button variant="outline" size="sm" className="ml-1 gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                }
              />
              <PortalLink token={cliente.portalToken} />
              <ExcluirClienteButton
                clienteId={cliente.id}
                clienteNome={cliente.nome}
                variant="botao"
                redirecionarApos="/clientes"
              />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {cliente.segmento} · cliente desde {cliente.desde}
            </p>
            <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-foreground">
              {cliente.objetivo}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Receita mensal</p>
              <p className="text-lg font-semibold text-foreground">
                {cliente.mrr > 0 ? brl(cliente.mrr) : "—"}
              </p>
            </div>
            {resp ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className={cn(resp.cor, "text-[10px] text-primary-foreground")}>
                    {resp.iniciais}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right leading-tight">
                  <p className="text-xs font-medium text-foreground">{resp.nome}</p>
                  <p className="text-[10px] text-muted-foreground">Responsável</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem responsável</p>
            )}
            {(cliente.contato || cliente.telefone) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {[cliente.contato, cliente.telefone].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>

        {/* Abas */}
        <Tabs defaultValue="visao" className="mt-6">
          <TabsList className="-mx-4 flex h-auto w-[calc(100%+2rem)] justify-start gap-1 overflow-x-auto whitespace-nowrap bg-transparent px-4 py-0 [scrollbar-width:none] md:mx-0 md:w-full md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
            <TabTrigger value="visao" icon={Target} label="Visão geral" />
            <TabTrigger value="calendario" icon={CalendarDays} label="Calendário" />
            <TabTrigger value="conteudo" icon={Video} label="Conteúdo" />
            <TabTrigger value="estrategia" icon={LineChart} label="Estratégia" />
            <TabTrigger value="arquivos" icon={FolderOpen} label="Arquivos" />
            <TabTrigger value="comunicacao" icon={MessageSquare} label="Comunicação" />
            <TabTrigger value="resultados" icon={ArrowUpRight} label="Resultados" />
          </TabsList>

          {/* Visão geral */}
          <TabsContent value="visao" className="mt-5">
            <div className="mb-3 flex justify-end">
              <VisaoGeralDialog
                clienteId={cliente.id}
                resumoEstrategico={resumo}
                metas={metas}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar visão geral
                  </Button>
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card titulo="Resumo estratégico" className="lg:col-span-2">
                {resumo ? (
                  <p className="text-pretty text-sm leading-relaxed text-foreground">{resumo}</p>
                ) : (
                  <Vazio texto="Nenhum resumo estratégico definido. Clique em Editar visão geral para adicionar." />
                )}
              </Card>
              <Card titulo="Metas do cliente">
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
                  <Vazio texto="Nenhuma meta definida." />
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Calendário */}
          <TabsContent value="calendario" className="mt-5">
            <div className="mb-3 flex justify-end">
              <CalendarioDialog
                clienteId={cliente.id}
                eventos={eventos}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar calendário
                  </Button>
                }
              />
            </div>
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
                <Vazio texto="Nenhuma entrega agendada." />
              )}
            </Card>
          </TabsContent>

          {/* Conteúdo */}
          <TabsContent value="conteudo" className="mt-5">
            <div className="mb-3 flex justify-end">
              <ConteudoDialog
                clienteId={cliente.id}
                conteudos={conteudos}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar conteúdo
                  </Button>
                }
              />
            </div>
            <Card titulo="Pipeline de conteúdo">
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
                <Vazio texto="Nenhum conteúdo em produção." />
              )}
            </Card>
          </TabsContent>

          {/* Estratégia */}
          <TabsContent value="estrategia" className="mt-5">
            <div className="mb-3 flex justify-end">
              <EstrategiaDialog
                clienteId={cliente.id}
                estrategia={estrategia}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar estratégia
                  </Button>
                }
              />
            </div>
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
                  <Vazio texto="Nenhum item no plano. Clique em Editar estratégia." />
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
                  <Vazio texto="Nenhum insight registrado." />
                )}
              </Card>
              <Card titulo="Concorrentes acompanhados" className="lg:col-span-2">
                {estrategia.concorrentes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {estrategia.concorrentes.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Vazio texto="Nenhum concorrente mapeado." />
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Arquivos */}
          <TabsContent value="arquivos" className="mt-5">
            <div className="mb-3 flex justify-end">
              <ArquivosDialog
                clienteId={cliente.id}
                arquivos={arquivos}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar arquivos
                  </Button>
                }
              />
            </div>
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
                        <span className="shrink-0 text-xs text-muted-foreground">Sem link</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio texto="Nenhum arquivo. Clique em Editar arquivos para adicionar um link." />
              )}
            </Card>
          </TabsContent>

          {/* Comunicação */}
          <TabsContent value="comunicacao" className="mt-5">
            <div className="mb-3 flex justify-end">
              <ComunicacaoDialog
                clienteId={cliente.id}
                mensagens={mensagens}
                membros={membros}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar comunicação
                  </Button>
                }
              />
            </div>
            <Card titulo="Histórico de alinhamentos">
              {mensagens.length > 0 ? (
                <ul className="space-y-4">
                  {mensagens.map((m) => {
                    const autor = membroPorId(m.autorId)
                    return (
                      <li key={m.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={cn(autor?.cor, "text-[10px] text-primary-foreground")}>
                            {autor?.iniciais ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{autor?.nome ?? "Sem autor"}</span>
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
                <Vazio texto="Nenhum alinhamento registrado." />
              )}
            </Card>
          </TabsContent>

          {/* Resultados */}
          <TabsContent value="resultados" className="mt-5">
            <div className="mb-3 flex justify-end">
              <ResultadosDialog
                clienteId={cliente.id}
                resultados={resultados}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar resultados
                  </Button>
                }
              />
            </div>
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
              <Card titulo="Métricas de desempenho">
                <Vazio texto="Nenhum resultado registrado. Clique em Editar resultados para adicionar métricas." />
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
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

function Card({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
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
