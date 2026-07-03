"use client"

import Link from "next/link"
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
  LineChart,
  LinkIcon,
  MessageSquare,
  Network,
  Pencil,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Video,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { HistoricoDialog } from "@/components/clientes/historico-dialog"
import { ExcluirRegistroButton } from "@/components/clientes/excluir-registro-button"
import { MemoriaSecao } from "@/components/clientes/memoria-secao"
import { ReuniaoDialog } from "@/components/clientes/reuniao-dialog"
import { ExcluirReuniaoButton } from "@/components/clientes/excluir-reuniao-button"
import { PerformanceDialog } from "@/components/clientes/performance-dialog"
import { ExcluirPerformanceButton } from "@/components/clientes/excluir-performance-button"
import { ExperimentoDialog } from "@/components/clientes/experimento-dialog"
import { ExcluirExperimentoButton } from "@/components/clientes/excluir-experimento-button"
import { PadroesPanel } from "@/components/clientes/padroes-panel"
import { atualizarClienteAction } from "@/app/(crm)/clientes/actions"
import type { RegistroHistorico } from "@/lib/historico-db"
import type { MemoriaCliente } from "@/lib/memoria-db"
import { SECOES_MEMORIA } from "@/lib/memoria-secoes"
import type { Reuniao } from "@/lib/reunioes-db"
import type { ConteudoPerformance } from "@/lib/performance-db"
import type { Experimento, StatusExperimento } from "@/lib/experimentos-db"
import type { Padrao } from "@/lib/padroes-db"
import type { EnvioCliente } from "@/lib/envios-db"

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

const statusExperimentoInfo: Record<StatusExperimento, { label: string; classe: string }> = {
  em_teste: { label: "Em teste", classe: "bg-chart-3/15 text-chart-3" },
  repetir: { label: "Repetir", classe: "bg-chart-4/15 text-chart-4" },
  melhorar: { label: "Melhorar", classe: "bg-chart-5/15 text-chart-5" },
  descartar: { label: "Descartar", classe: "bg-destructive/15 text-destructive" },
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
  historico,
  memoria,
  reunioes,
  performance,
  experimentos,
  padroes,
  ultimaAnalisePadroes,
  envios,
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
  historico: RegistroHistorico[]
  memoria: MemoriaCliente
  reunioes: Reuniao[]
  performance: ConteudoPerformance[]
  experimentos: Experimento[]
  padroes: Padrao[]
  ultimaAnalisePadroes: string | null
  envios: EnvioCliente[]
}) {
  const responsaveis = (cliente.responsaveisIds ?? [])
    .map((rid) => membros.find((m) => m.id === rid))
    .filter(Boolean) as Membro[]
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
            {cliente.logoUrl && <AvatarImage src={cliente.logoUrl || "/placeholder.svg"} alt={`Logo ${cliente.nome}`} className="object-cover" />}
            <AvatarFallback className={cn(cliente.cor, "text-xl font-semibold text-primary-foreground")}>
              {cliente.iniciais}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {cliente.nome}
              </h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  cliente.recorrente ? statusClienteInfo[cliente.status].classe : "bg-chart-3/15 text-chart-3",
                )}
              >
                {cliente.recorrente ? statusClienteInfo[cliente.status].label : "Avulso"}
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
              <p className="text-xs text-muted-foreground">
                {cliente.recorrente ? "Receita mensal" : "Valor (avulso)"}
              </p>
              <p className="text-lg font-semibold text-foreground">
                {cliente.mrr > 0 ? brl(cliente.mrr) : "—"}
              </p>
            </div>
            {responsaveis.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {responsaveis.map((m) => (
                    <Avatar key={m.id} className="h-7 w-7 ring-2 ring-card" title={m.nome}>
                      <AvatarFallback className={cn(m.cor, "text-[10px] text-primary-foreground")}>
                        {m.iniciais}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="text-right leading-tight">
                  <p className="text-xs font-medium text-foreground">
                    {responsaveis.map((m) => m.nome).join(", ")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {responsaveis.length > 1 ? "Responsáveis" : "Responsável"}
                  </p>
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
          <TabsList className="-mx-4 flex h-auto w-[calc(100%+2rem)] justify-start gap-1 overflow-x-auto whitespace-nowrap bg-transparent px-4 py-0 [scrollbar-width:none] group-data-horizontal/tabs:h-auto md:mx-0 md:w-full md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
            <TabTrigger value="visao" icon={Target} label="Visão geral" />
            <TabTrigger value="calendario" icon={CalendarDays} label="Calendário" />
            <TabTrigger value="conteudo" icon={Video} label="Conteúdo" />
            <TabTrigger value="estrategia" icon={LineChart} label="Estratégia" />
            <TabTrigger value="arquivos" icon={FolderOpen} label="Arquivos" />
            <TabTrigger value="comunicacao" icon={MessageSquare} label="Comunicação" />
            <TabTrigger value="resultados" icon={ArrowUpRight} label="Resultados" />
            <TabTrigger value="evolucao" icon={TrendingUp} label="Evolução" />
            <TabTrigger value="reunioes" icon={Users} label="Reuniões" />
            <TabTrigger value="performance" icon={BarChart3} label="Performance" />
            <TabTrigger value="experimentos" icon={FlaskConical} label="Experimentos" />
            <TabTrigger value="padroes" icon={Network} label="Padrões" />
            <TabTrigger value="memoria" icon={Brain} label="Memória" />
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

            {/* Enviados pelo cliente via portal (links de Drive/WeTransfer/etc.) */}
            <Card titulo="Enviados pelo cliente" className="mt-4">
              <p className="-mt-1 mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <LinkIcon className="h-3.5 w-3.5 text-primary" />
                Links de vídeos e fotos que o cliente enviou pelo portal.
              </p>
              {envios.length > 0 ? (
                <ul className="divide-y divide-border">
                  {envios.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <LinkIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{e.titulo}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {e.descricao ||
                            new Date(e.criadoEm).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                        </p>
                      </div>
                      <a
                        href={e.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio texto="O cliente ainda não enviou materiais pelo portal." />
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

          {/* Evolução (histórico interno — não aparece no portal do cliente) */}
          <TabsContent value="evolucao" className="mt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Linha do tempo do cliente, organizada pela IA. Visível só para a equipe.
              </div>
              <HistoricoDialog
                clienteId={cliente.id}
                trigger={
                  <Button size="sm" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Novo registro
                  </Button>
                }
              />
            </div>

            {historico.length > 0 ? (
              <ol className="relative ml-3 space-y-5 border-l border-border pl-6">
                {historico.map((reg) => (
                  <li key={reg.id} className="relative">
                    <span className="absolute -left-[1.69rem] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                    <div className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{reg.referencia}</h3>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(reg.criadoEm).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <ExcluirRegistroButton id={reg.id} clienteId={cliente.id} />
                      </div>

                      {reg.metricas.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {reg.metricas.map((m, i) => (
                            <div key={i} className="rounded-lg border border-border bg-background p-3">
                              <p className="text-xs text-muted-foreground">{m.rotulo}</p>
                              <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">{m.valor}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {reg.analise && (
                        <p className="mt-4 text-pretty text-sm leading-relaxed text-foreground">{reg.analise}</p>
                      )}

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {reg.resolvidos.length > 0 && (
                          <ListaEvolucao titulo="Resolvido" itens={reg.resolvidos} cor="text-chart-4" />
                        )}
                        {reg.novosProblemas.length > 0 && (
                          <ListaEvolucao titulo="A resolver" itens={reg.novosProblemas} cor="text-destructive" />
                        )}
                      </div>

                      {reg.proximosPassos.length > 0 && (
                        <div className="mt-4 rounded-lg bg-primary/5 p-3">
                          <ListaEvolucao titulo="Próximos passos" itens={reg.proximosPassos} cor="text-primary" />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Card titulo="Linha do tempo">
                <Vazio texto='Nenhum registro ainda. Clique em "Novo registro" e escreva como foi o período — a IA organiza.' />
              </Card>
            )}
          </TabsContent>

          {/* Reuniões (Meeting Memory — uso interno; alimenta o Chat Estratégico) */}
          <TabsContent value="reunioes" className="mt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                Anotações de reuniões organizadas pela IA. Visível só para a equipe.
              </div>
              <ReuniaoDialog
                clienteId={cliente.id}
                trigger={
                  <Button size="sm" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Nova reunião
                  </Button>
                }
              />
            </div>

            {reunioes.length > 0 ? (
              <ol className="relative ml-3 space-y-5 border-l border-border pl-6">
                {reunioes.map((r) => (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[1.69rem] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                    <div className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{r.titulo}</h3>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(r.data).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <ExcluirReuniaoButton id={r.id} clienteId={cliente.id} />
                      </div>

                      {r.resumo && (
                        <p className="mt-4 text-pretty text-sm leading-relaxed text-foreground">{r.resumo}</p>
                      )}

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {r.decisoes.length > 0 && (
                          <ListaEvolucao titulo="Decisões" itens={r.decisoes} cor="text-chart-4" />
                        )}
                        {r.problemas.length > 0 && (
                          <ListaEvolucao titulo="Problemas" itens={r.problemas} cor="text-destructive" />
                        )}
                        {r.proximasAcoes.length > 0 && (
                          <ListaEvolucao titulo="Próximas ações" itens={r.proximasAcoes} cor="text-primary" />
                        )}
                        {r.insights.length > 0 && (
                          <ListaEvolucao titulo="Insights" itens={r.insights} cor="text-chart-2" />
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Card titulo="Reuniões">
                <Vazio texto='Nenhuma reunião registrada. Clique em "Nova reunião" e cole suas anotações — a IA organiza.' />
              </Card>
            )}
          </TabsContent>

          {/* Performance de conteúdo (alimenta o Chat Estratégico e as próximas estratégias) */}
          <TabsContent value="performance" className="mt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                Conteúdos publicados com métricas. A IA gera aprendizados e usa tudo nas recomendações.
              </div>
              <PerformanceDialog
                clienteId={cliente.id}
                trigger={
                  <Button size="sm" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Novo conteúdo
                  </Button>
                }
              />
            </div>

            {performance.length > 0 ? (
              <div className="grid gap-4">
                {performance.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">{p.titulo}</h3>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {p.formato}
                          </span>
                        </div>
                        {p.data && (
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(p.data).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                      <ExcluirPerformanceButton id={p.id} clienteId={cliente.id} />
                    </div>

                    {(p.gancho || p.objetivo) && (
                      <div className="mt-3 space-y-1 text-sm">
                        {p.gancho && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Gancho:</span> {p.gancho}
                          </p>
                        )}
                        {p.objetivo && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Objetivo:</span> {p.objetivo}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Metrica rotulo="Views" valor={p.views} />
                      <Metrica rotulo="Alcance" valor={p.alcance} />
                      <Metrica rotulo="Curtidas" valor={p.curtidas} />
                      <Metrica rotulo="Comentários" valor={p.comentarios} />
                      <Metrica rotulo="Salvamentos" valor={p.salvamentos} />
                      <Metrica rotulo="Compart." valor={p.compartilhamentos} />
                    </div>

                    {p.aprendizados.length > 0 && (
                      <div className="mt-4 rounded-lg bg-primary/5 p-3">
                        <ListaEvolucao titulo="Aprendizados da IA" itens={p.aprendizados} cor="text-primary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Card titulo="Conteúdos publicados">
                <Vazio texto='Nenhum conteúdo registrado. Clique em "Novo conteúdo", informe as métricas e a IA gera os aprendizados.' />
              </Card>
            )}
          </TabsContent>

          {/* Experimentos (banco de testes — a IA consulta antes de sugerir estratégia) */}
          <TabsContent value="experimentos" className="mt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FlaskConical className="h-4 w-4 text-primary" />
                Hipóteses testadas e seus vereditos. A IA consulta isto antes de recomendar estratégias.
              </div>
              <ExperimentoDialog
                clienteId={cliente.id}
                trigger={
                  <Button size="sm" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Novo experimento
                  </Button>
                }
              />
            </div>

            {experimentos.length > 0 ? (
              <div className="grid gap-4">
                {experimentos.map((exp) => {
                  const info = statusExperimentoInfo[exp.status]
                  return (
                    <div key={exp.id} className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", info.classe)}>
                            {info.label}
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(exp.criadoEm).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <ExcluirExperimentoButton id={exp.id} clienteId={cliente.id} />
                      </div>

                      <p className="mt-3 text-pretty text-sm font-medium leading-relaxed text-foreground">
                        {exp.hipotese}
                      </p>

                      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                        {exp.oQueFoiTestado && (
                          <p>
                            <span className="font-medium text-foreground">O que testamos:</span> {exp.oQueFoiTestado}
                          </p>
                        )}
                        {exp.resultado && (
                          <p>
                            <span className="font-medium text-foreground">Resultado:</span> {exp.resultado}
                          </p>
                        )}
                      </div>

                      {exp.conclusao && (
                        <div className="mt-3 rounded-lg bg-primary/5 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Conclusão da IA</p>
                          <p className="mt-1 text-pretty text-sm leading-relaxed text-foreground">{exp.conclusao}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <Card titulo="Banco de experimentos">
                <Vazio texto='Nenhum experimento ainda. Clique em "Novo experimento", descreva a hipótese e o resultado — a IA conclui e classifica.' />
              </Card>
            )}
          </TabsContent>

          {/* Padrões (Knowledge Graph — a IA cruza tudo e aprende os padrões deste cliente) */}
          <TabsContent value="padroes" className="mt-5">
            <PadroesPanel clienteId={cliente.id} padroes={padroes} ultimaAnalise={ultimaAnalisePadroes} />
          </TabsContent>

          {/* Memória do cliente (Client Memory — usada pela IA no Chat Estratégico) */}
          <TabsContent value="memoria" className="mt-5">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4 text-primary" />
              Memória que a IA SIMPLE OS consulta sobre este cliente. Quanto mais completa, melhores as respostas.
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {SECOES_MEMORIA.map((secao) => (
                <MemoriaSecao key={secao.id} clienteId={cliente.id} secao={secao} valor={memoria[secao.id] ?? ""} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{rotulo}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {valor != null ? valor.toLocaleString("pt-BR") : "—"}
      </p>
    </div>
  )
}

function ListaEvolucao({ titulo, itens, cor }: { titulo: string; itens: string[]; cor: string }) {
  return (
    <div>
      <p className={cn("mb-1.5 text-xs font-semibold uppercase tracking-wide", cor)}>{titulo}</p>
      <ul className="space-y-1.5">
        {itens.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current", cor)} />
            <span className="text-pretty leading-relaxed">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TabTrigger({ value, icon: Icon, label }: { value: string; icon: typeof Target; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="h-auto flex-none shrink-0 gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
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
