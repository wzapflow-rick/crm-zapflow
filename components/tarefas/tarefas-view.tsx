"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Calendar, Check, Clock, ListChecks, Pencil, Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Topbar } from "@/components/simple/topbar"
import { TarefaDialog, type ClienteOpcao } from "@/components/tarefas/tarefa-dialog"
import { EventoDialog } from "@/components/calendario/evento-dialog"
import {
  alternarConclusaoAction,
  atualizarTarefaAction,
  criarTarefaAction,
  excluirTarefaAction,
} from "@/app/(crm)/tarefas/actions"
import {
  alternarConclusaoEventoAction,
  atualizarEventoAction,
  excluirEventoAction,
} from "@/app/(crm)/calendario/actions"
import { RANK_PRIORIDADE, type Prioridade, type Tarefa } from "@/lib/tarefas-types"
import { ESTILO_TIPO, type Evento } from "@/lib/eventos-types"
import type { Membro } from "@/lib/membros-db"

const prioridadeEstilo: Record<Prioridade, string> = {
  alta: "bg-primary/10 text-primary",
  media: "bg-chart-2/15 text-chart-2",
  baixa: "bg-muted text-muted-foreground",
}
const prioridadeLabel: Record<Prioridade, string> = { alta: "Alta", media: "Média", baixa: "Baixa" }

const selectClasses =
  "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

const SEM_DATA = "sem-data"
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// Item unificado do checklist: um compromisso do calendário OU uma tarefa solta.
type Item = {
  id: string
  origem: "evento" | "tarefa"
  titulo: string
  data: string // YYYY-MM-DD ou "" (tarefa sem prazo)
  hora: string // "" quando não há horário
  tipo: string // TipoEvento (evento) ou "tarefa"
  clienteId: string
  responsaveisIds: string[]
  prioridade: Prioridade | null // só para tarefa
  concluido: boolean
  evento?: Evento
  tarefa?: Tarefa
}

function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Rótulo amigável de um dia do checklist.
function rotularDia(data: string): { titulo: string; sub: string; atrasado: boolean } {
  if (!data) return { titulo: "Sem data", sub: "Tarefas sem prazo definido", atrasado: false }
  const hoje = hojeISO()
  const [ano, mes, dia] = data.split("-").map(Number)
  const d = new Date(ano, mes - 1, dia)
  const ddmm = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`
  const diaSemana = SEMANA[d.getDay()]
  if (data < hoje) return { titulo: `Atrasado · ${ddmm}`, sub: diaSemana, atrasado: true }
  // diferença em dias
  const base = new Date(hoje.split("-").map(Number)[0], hoje.split("-").map(Number)[1] - 1, hoje.split("-").map(Number)[2])
  const diff = Math.round((d.getTime() - base.getTime()) / 86_400_000)
  if (diff === 0) return { titulo: "Hoje", sub: ddmm, atrasado: false }
  if (diff === 1) return { titulo: "Amanhã", sub: ddmm, atrasado: false }
  return { titulo: `${diaSemana}, ${ddmm}`, sub: "", atrasado: false }
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

function ConfirmarExclusao({ item, onConfirmar }: { item: Item; onConfirmar: () => void }) {
  const [aberto, setAberto] = useState(false)
  const oQue = item.origem === "evento" ? "O compromisso" : "A tarefa"
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Excluir item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir item?</DialogTitle>
          <DialogDescription>
            {`${oQue} "${item.titulo}" será removido permanentemente. Esta ação não pode ser desfeita.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              setAberto(false)
              onConfirmar()
            }}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TarefasView({
  tarefas: tarefasIniciais,
  eventos: eventosIniciais,
  clientes,
  membros,
  erro,
}: {
  tarefas: Tarefa[]
  eventos: Evento[]
  clientes: ClienteOpcao[]
  membros: Membro[]
  erro: string | null
}) {
  const [tarefas, setTarefas] = useState(tarefasIniciais)
  const [eventos, setEventos] = useState(eventosIniciais)
  const [, startTransition] = useTransition()

  // Filtros
  const [busca, setBusca] = useState("")
  const [filtroResp, setFiltroResp] = useState("")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false)

  useEffect(() => setTarefas(tarefasIniciais), [tarefasIniciais])
  useEffect(() => setEventos(eventosIniciais), [eventosIniciais])

  const membroPorId = (id: string) => membros.find((m) => m.id === id)
  const clientePorId = (id: string) => clientes.find((c) => c.id === id)

  // Lista unificada de itens (compromissos + tarefas).
  const itens = useMemo<Item[]>(() => {
    const deEventos: Item[] = eventos.map((e) => ({
      id: e.id,
      origem: "evento",
      titulo: e.titulo,
      data: e.data,
      hora: e.hora,
      tipo: e.tipo,
      clienteId: e.clienteId,
      responsaveisIds: e.responsaveisIds,
      prioridade: null,
      concluido: e.concluido,
      evento: e,
    }))
    const deTarefas: Item[] = tarefas.map((t) => ({
      id: t.id,
      origem: "tarefa",
      titulo: t.titulo,
      data: t.prazo,
      hora: "",
      tipo: "tarefa",
      clienteId: t.clienteId,
      responsaveisIds: t.responsavelId ? [t.responsavelId] : [],
      prioridade: t.prioridade,
      concluido: t.status === "concluido",
      tarefa: t,
    }))
    return [...deEventos, ...deTarefas]
  }, [eventos, tarefas])

  function toggleConcluido(item: Item) {
    const novo = !item.concluido
    if (item.origem === "tarefa") {
      setTarefas((atual) =>
        atual.map((x) => (x.id === item.id ? { ...x, status: novo ? "concluido" : "pendente" } : x)),
      )
      startTransition(async () => {
        await alternarConclusaoAction(item.id, novo)
      })
    } else {
      setEventos((atual) => atual.map((x) => (x.id === item.id ? { ...x, concluido: novo } : x)))
      startTransition(async () => {
        await alternarConclusaoEventoAction(item.id, novo)
      })
    }
  }

  function removerItem(item: Item) {
    if (item.origem === "tarefa") {
      setTarefas((atual) => atual.filter((x) => x.id !== item.id))
      startTransition(async () => {
        await excluirTarefaAction(item.id)
      })
    } else {
      setEventos((atual) => atual.filter((x) => x.id !== item.id))
      startTransition(async () => {
        await excluirEventoAction(item.id)
      })
    }
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return itens.filter((i) => {
      if (termo && !i.titulo.toLowerCase().includes(termo)) return false
      if (filtroResp && !i.responsaveisIds.includes(filtroResp)) return false
      if (filtroCliente === "__interna" ? i.clienteId !== "" : filtroCliente && i.clienteId !== filtroCliente)
        return false
      if (filtroTipo === "tarefa" && i.origem !== "tarefa") return false
      if (filtroTipo === "evento" && i.origem !== "evento") return false
      return true
    })
  }, [itens, busca, filtroResp, filtroCliente, filtroTipo])

  const pendentes = useMemo(() => filtrados.filter((i) => !i.concluido), [filtrados])
  const concluidos = useMemo(() => filtrados.filter((i) => i.concluido), [filtrados])

  // Agrupa os pendentes por dia. "Sem data" vai por último.
  const grupos = useMemo(() => {
    const mapa = new Map<string, Item[]>()
    for (const i of pendentes) {
      const chave = i.data || SEM_DATA
      const lista = mapa.get(chave) ?? []
      lista.push(i)
      mapa.set(chave, lista)
    }
    const chaves = [...mapa.keys()].sort((a, b) => {
      if (a === SEM_DATA) return 1
      if (b === SEM_DATA) return -1
      return a.localeCompare(b)
    })
    return chaves.map((chave) => {
      const lista = mapa.get(chave)!.sort((a, b) => {
        // Com horário primeiro (ordenado por hora); depois por prioridade da tarefa.
        if (a.hora && b.hora) return a.hora.localeCompare(b.hora)
        if (a.hora !== b.hora) return a.hora ? -1 : 1
        const ra = a.prioridade ? RANK_PRIORIDADE[a.prioridade] : 1
        const rb = b.prioridade ? RANK_PRIORIDADE[b.prioridade] : 1
        return ra - rb
      })
      return { chave, data: chave === SEM_DATA ? "" : chave, itens: lista }
    })
  }, [pendentes])

  const novoTrigger = (
    <Button>
      <Plus className="mr-1.5 h-4 w-4" />
      Nova tarefa
    </Button>
  )

  function LinhaItem({ item }: { item: Item }) {
    const concluido = item.concluido
    const cliente = clientePorId(item.clienteId)
    const estiloTipo = ESTILO_TIPO[item.tipo]
    return (
      <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
        <button
          onClick={() => toggleConcluido(item)}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            concluido
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary",
          )}
          aria-label={concluido ? "Marcar como pendente" : "Marcar como concluído"}
        >
          {concluido && <Check className="h-3 w-3" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium text-foreground", concluido && "text-muted-foreground line-through")}>
            {item.titulo}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {item.hora && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Clock className="h-3 w-3" />
                {item.hora}
              </span>
            )}
            {item.origem === "evento" && estiloTipo ? (
              <span className={cn("rounded-full px-2 py-0.5 font-medium", estiloTipo.chip)}>{estiloTipo.label}</span>
            ) : item.prioridade ? (
              <span className={cn("rounded-full px-2 py-0.5 font-medium", prioridadeEstilo[item.prioridade])}>
                {prioridadeLabel[item.prioridade]}
              </span>
            ) : null}
            {cliente && <span className="truncate">· {cliente.nome}</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <div className="mr-0.5 flex -space-x-1">
            {item.responsaveisIds.map((rid) => (
              <Avatarzinho key={rid} membro={membroPorId(rid)} />
            ))}
          </div>
          {item.origem === "tarefa" ? (
            <TarefaDialog
              clientes={clientes}
              membros={membros}
              tarefa={item.tarefa}
              acao={atualizarTarefaAction}
              titulo="Editar tarefa"
              descricao="Atualize os dados da tarefa."
              textoBotao="Salvar alterações"
              trigger={
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Editar tarefa"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              }
            />
          ) : (
            <EventoDialog
              clientes={clientes}
              membros={membros}
              evento={item.evento}
              acao={atualizarEventoAction}
              titulo="Editar compromisso"
              descricao="Atualize os dados do compromisso do calendário."
              textoBotao="Salvar alterações"
              trigger={
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Editar compromisso"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              }
            />
          )}
          <ConfirmarExclusao item={item} onConfirmar={() => removerItem(item)} />
        </div>
      </li>
    )
  }

  return (
    <>
      <Topbar titulo="Tarefas" />
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Checklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {pendentes.length} {pendentes.length === 1 ? "item pendente" : "itens pendentes"}
              {concluidos.length > 0 ? ` · ${concluidos.length} concluído${concluidos.length === 1 ? "" : "s"}` : ""}
              {" · inclui os compromissos do calendário"}
            </p>
          </div>
          <TarefaDialog
            clientes={clientes}
            membros={membros}
            acao={criarTarefaAction}
            titulo="Nova tarefa"
            descricao="Crie uma tarefa interna ou vinculada a um cliente. Compromissos com data aparecem também no calendário."
            textoBotao="Adicionar tarefa"
            trigger={novoTrigger}
          />
        </div>

        {erro && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {`Não foi possível carregar do banco: ${erro}`}
          </p>
        )}

        {/* Filtros */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar item..."
            className="h-9 w-full sm:w-52"
          />
          <select value={filtroResp} onChange={(e) => setFiltroResp(e.target.value)} className={selectClasses}>
            <option value="">Todos responsáveis</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className={selectClasses}>
            <option value="">Todos clientes</option>
            <option value="__interna">Itens internos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={selectClasses}>
            <option value="">Tudo</option>
            <option value="evento">Compromissos</option>
            <option value="tarefa">Tarefas</option>
          </select>
        </div>

        {/* Checklist agrupado por dia */}
        {grupos.length > 0 ? (
          <div className="mt-5 flex flex-col gap-4">
            {grupos.map((g) => {
              const rot = rotularDia(g.data)
              return (
                <div key={g.chave} className="rounded-xl border border-border bg-card p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Calendar className={cn("h-4 w-4", rot.atrasado ? "text-destructive" : "text-muted-foreground")} />
                    <h3 className={cn("text-sm font-semibold", rot.atrasado ? "text-destructive" : "text-foreground")}>
                      {rot.titulo}
                    </h3>
                    {rot.sub && <span className="text-xs text-muted-foreground">{rot.sub}</span>}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {g.itens.length} {g.itens.length === 1 ? "item" : "itens"}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {g.itens.map((item) => (
                      <LinhaItem key={`${item.origem}-${item.id}`} item={item} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-12 text-center">
            <ListChecks className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {itens.length === 0
                ? "Nada por aqui ainda. Crie uma tarefa acima ou um compromisso no calendário."
                : "Nenhum item pendente com esses filtros."}
            </p>
          </div>
        )}

        {/* Concluídos */}
        {concluidos.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setMostrarConcluidas((v) => !v)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {mostrarConcluidas ? "Ocultar" : "Mostrar"} concluídos ({concluidos.length})
            </button>
            {mostrarConcluidas && (
              <div className="mt-3 rounded-xl border border-border bg-card p-5 sm:p-6">
                <ul className="divide-y divide-border">
                  {concluidos.map((item) => (
                    <LinhaItem key={`${item.origem}-${item.id}`} item={item} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
