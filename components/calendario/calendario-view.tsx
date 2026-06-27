"use client"

import { useMemo, useState, useTransition } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Topbar } from "@/components/simple/topbar"
import { EventoDialog, type ClienteOpcao } from "@/components/calendario/evento-dialog"
import { criarEventoAction, atualizarEventoAction, excluirEventoAction } from "@/app/(crm)/calendario/actions"
import { ESTILO_TIPO, TIPOS_EVENTO, type Evento, type ItemCalendario } from "@/lib/eventos-types"
import type { Tarefa } from "@/lib/tarefas-types"
import type { Membro } from "@/lib/membros-db"

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const selectClasses =
  "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

function isoOf(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dia}`
}

function formatarDiaLongo(iso: string) {
  const [a, m, d] = iso.split("-").map(Number)
  return `${String(d).padStart(2, "0")} de ${MESES[m - 1]} de ${a}`
}

function Avatarzinho({ membro }: { membro?: Membro }) {
  if (!membro) return null
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-primary-foreground",
        membro.cor,
      )}
      title={membro.nome}
    >
      {membro.iniciais}
    </span>
  )
}

export function CalendarioView({
  eventos,
  tarefas,
  clientes,
  membros,
  erro,
}: {
  eventos: Evento[]
  tarefas: Tarefa[]
  clientes: ClienteOpcao[]
  membros: Membro[]
  erro: string | null
}) {
  const hojeIso = isoOf(new Date())
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selecionado, setSelecionado] = useState(hojeIso)
  const [filtroResp, setFiltroResp] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [isPending, startTransition] = useTransition()

  // Diálogos controlados
  const [criar, setCriar] = useState<{ open: boolean; data: string }>({ open: false, data: hojeIso })
  const [editando, setEditando] = useState<Evento | null>(null)

  const clientePorId = useMemo(() => {
    const m = new Map(clientes.map((c) => [c.id, c.nome]))
    return (id: string) => (id ? m.get(id) ?? null : null)
  }, [clientes])
  const membroPorId = useMemo(() => {
    const m = new Map(membros.map((x) => [x.id, x]))
    return (id: string) => (id ? m.get(id) : undefined)
  }, [membros])
  const eventoPorId = useMemo(() => new Map(eventos.map((e) => [e.id, e])), [eventos])

  // Junta eventos + tarefas (não concluídas, com prazo) em itens do calendário
  const itens = useMemo<ItemCalendario[]>(() => {
    const deEventos: ItemCalendario[] = eventos.map((e) => ({
      id: e.id,
      origem: "evento",
      titulo: e.titulo,
      data: e.data,
      hora: e.hora,
      tipo: e.tipo,
      clienteId: e.clienteId,
      responsaveisIds: e.responsaveisIds,
    }))
    const deTarefas: ItemCalendario[] = tarefas
      .filter((t) => t.prazo && t.status !== "concluido")
      .map((t) => ({
        id: t.id,
        origem: "tarefa",
        titulo: t.titulo,
        data: t.prazo,
        hora: "",
        tipo: "tarefa",
        clienteId: t.clienteId,
        responsaveisIds: t.responsavelId ? [t.responsavelId] : [],
      }))
    return [...deEventos, ...deTarefas].filter((i) => {
      if (filtroResp && !i.responsaveisIds.includes(filtroResp)) return false
      if (filtroTipo && i.tipo !== filtroTipo) return false
      return true
    })
  }, [eventos, tarefas, filtroResp, filtroTipo])

  // Mapa data(iso) -> itens ordenados por hora
  const itensPorDia = useMemo(() => {
    const m = new Map<string, ItemCalendario[]>()
    for (const i of itens) {
      if (!i.data) continue
      const arr = m.get(i.data) ?? []
      arr.push(i)
      m.set(i.data, arr)
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        if (!a.hora && b.hora) return 1
        if (a.hora && !b.hora) return -1
        return a.hora.localeCompare(b.hora)
      })
    }
    return m
  }, [itens])

  // Grade de 6 semanas (42 dias) começando no domingo
  const semanas = useMemo(() => {
    const ano = cursor.getFullYear()
    const mes = cursor.getMonth()
    const inicio = new Date(ano, mes, 1 - new Date(ano, mes, 1).getDay())
    const dias: { iso: string; dia: number; doMes: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)
      dias.push({ iso: isoOf(d), dia: d.getDate(), doMes: d.getMonth() === mes })
    }
    const linhas: (typeof dias)[] = []
    for (let i = 0; i < 42; i += 7) linhas.push(dias.slice(i, i + 7))
    return linhas
  }, [cursor])

  const itensDoDia = itensPorDia.get(selecionado) ?? []

  function irMes(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }
  function irHoje() {
    const n = new Date()
    setCursor(new Date(n.getFullYear(), n.getMonth(), 1))
    setSelecionado(hojeIso)
  }
  function excluir(id: string) {
    startTransition(async () => {
      await excluirEventoAction(id)
    })
  }

  const novoTrigger = (
    <Button size="sm" className="gap-1.5">
      <Plus className="h-4 w-4" /> Novo compromisso
    </Button>
  )

  return (
    <>
      <Topbar titulo="Calendário" />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {MESES[cursor.getMonth()]} {cursor.getFullYear()}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => irMes(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={irHoje}
                className="rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Hoje
              </button>
              <button
                onClick={() => irMes(1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filtroResp} onChange={(e) => setFiltroResp(e.target.value)} className={selectClasses}>
              <option value="">Todos responsáveis</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={selectClasses}>
              <option value="">Todos os tipos</option>
              {TIPOS_EVENTO.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
              <option value="tarefa">Tarefa</option>
            </select>
            <EventoDialog
              clientes={clientes}
              membros={membros}
              acao={criarEventoAction}
              titulo="Novo compromisso"
              descricao="Agende uma reunião, gravação, entrega ou publicação."
              textoBotao="Adicionar compromisso"
              trigger={novoTrigger}
            />
          </div>
        </div>

        {erro && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {`Não foi possível carregar do banco: ${erro}`}
          </p>
        )}

        {/* Legenda */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {[...TIPOS_EVENTO.map((t) => t.id), "tarefa"].map((tipo) => (
            <span key={tipo} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", ESTILO_TIPO[tipo]?.ponto)} />
              {ESTILO_TIPO[tipo]?.label}
            </span>
          ))}
        </div>

        {/* Grade do mês */}
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {semanas.flat().map((cel) => {
              const lista = itensPorDia.get(cel.iso) ?? []
              const hoje = cel.iso === hojeIso
              const sel = cel.iso === selecionado
              return (
                <button
                  key={cel.iso}
                  onClick={() => setSelecionado(cel.iso)}
                  className={cn(
                    "min-h-[68px] border-b border-r border-border p-1.5 text-left align-top transition-colors last:border-r-0 md:min-h-[104px]",
                    !cel.doMes && "bg-muted/30",
                    sel && "ring-2 ring-inset ring-primary",
                    "hover:bg-accent/50 focus:outline-none",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        hoje ? "bg-primary text-primary-foreground" : cel.doMes ? "text-foreground" : "text-muted-foreground/60",
                      )}
                    >
                      {cel.dia}
                    </span>
                    {lista.length > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground md:hidden">{lista.length}</span>
                    )}
                  </div>

                  {/* Mobile: pontinhos coloridos */}
                  <div className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                    {lista.slice(0, 4).map((i) => (
                      <span key={i.id} className={cn("h-1.5 w-1.5 rounded-full", ESTILO_TIPO[i.tipo]?.ponto)} />
                    ))}
                  </div>

                  {/* Desktop: chips com hora + título */}
                  <div className="mt-1 hidden flex-col gap-0.5 md:flex">
                    {lista.slice(0, 3).map((i) => (
                      <span
                        key={i.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          const ev = eventoPorId.get(i.id)
                          if (i.origem === "evento" && ev) setEditando(ev)
                          else setSelecionado(cel.iso)
                        }}
                        className={cn(
                          "truncate rounded px-1.5 py-0.5 text-[11px] leading-tight",
                          ESTILO_TIPO[i.tipo]?.chip,
                        )}
                        title={i.titulo}
                      >
                        {i.hora ? `${i.hora} ` : ""}
                        {i.titulo}
                      </span>
                    ))}
                    {lista.length > 3 && (
                      <span className="px-1.5 text-[10px] text-muted-foreground">+{lista.length - 3} mais</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Agenda do dia selecionado */}
        <div className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{formatarDiaLongo(selecionado)}</h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setCriar({ open: true, data: selecionado })}
            >
              <Plus className="h-4 w-4" /> Adicionar neste dia
            </Button>
          </div>

          {itensDoDia.length > 0 ? (
            <ul className="mt-4 divide-y divide-border">
              {itensDoDia.map((i) => {
                const cliente = clientePorId(i.clienteId)
                const responsaveis = i.responsaveisIds.map((rid) => membroPorId(rid)).filter(Boolean) as Membro[]
                const ev = i.origem === "evento" ? eventoPorId.get(i.id) : undefined
                return (
                  <li key={i.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", ESTILO_TIPO[i.tipo]?.ponto)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-foreground">{i.titulo}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className={cn("rounded-full px-2 py-0.5 font-medium", ESTILO_TIPO[i.tipo]?.chip)}>
                          {ESTILO_TIPO[i.tipo]?.label}
                        </span>
                        {i.hora ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {i.hora}
                          </span>
                        ) : (
                          <span>{i.origem === "tarefa" ? "Prazo" : "Dia inteiro"}</span>
                        )}
                        {cliente && <span className="truncate">· {cliente}</span>}
                        {i.origem === "tarefa" && <span className="text-chart-5">· Tarefa</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {responsaveis.length > 0 && (
                        <div className="mr-1 flex -space-x-1">
                          {responsaveis.map((m) => (
                            <Avatarzinho key={m.id} membro={m} />
                          ))}
                        </div>
                      )}
                      {ev && (
                        <>
                          <button
                            onClick={() => setEditando(ev)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            aria-label="Editar compromisso"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => excluir(ev.id)}
                            disabled={isPending}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            aria-label="Excluir compromisso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de criar (controlado, a partir do dia selecionado) */}
      <EventoDialog
        clientes={clientes}
        membros={membros}
        dataPadrao={criar.data}
        acao={criarEventoAction}
        titulo="Novo compromisso"
        descricao="Agende uma reunião, gravação, entrega ou publicação."
        textoBotao="Adicionar compromisso"
        open={criar.open}
        onOpenChange={(v) => setCriar((c) => ({ ...c, open: v }))}
      />

      {/* Diálogo de editar (controlado) */}
      {editando && (
        <EventoDialog
          clientes={clientes}
          membros={membros}
          evento={editando}
          acao={atualizarEventoAction}
          titulo="Editar compromisso"
          descricao="Atualize os dados do compromisso."
          textoBotao="Salvar alterações"
          open={!!editando}
          onOpenChange={(v) => !v && setEditando(null)}
        />
      )}
    </>
  )
}
