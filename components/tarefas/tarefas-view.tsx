"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Check, ListChecks, Pencil, Plus, Trash2 } from "lucide-react"
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
import {
  alternarConclusaoAction,
  atualizarTarefaAction,
  criarTarefaAction,
  excluirTarefaAction,
} from "@/app/(crm)/tarefas/actions"
import { PRIORIDADES, RANK_PRIORIDADE, type Prioridade, type Tarefa } from "@/lib/tarefas-types"
import type { Membro } from "@/lib/membros-db"

const prioridadeEstilo: Record<Prioridade, string> = {
  alta: "bg-primary/10 text-primary",
  media: "bg-chart-2/15 text-chart-2",
  baixa: "bg-muted text-muted-foreground",
}

const prioridadeLabel: Record<Prioridade, string> = { alta: "Alta", media: "Média", baixa: "Baixa" }

const selectClasses =
  "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

function descreverPrazo(prazo: string): { label: string; atrasada: boolean } {
  if (!prazo) return { label: "Sem prazo", atrasada: false }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [ano, mes, dia] = prazo.split("-").map(Number)
  const data = new Date(ano, mes - 1, dia)
  const diff = Math.round((data.getTime() - hoje.getTime()) / 86_400_000)
  const ddmm = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`
  if (diff < 0) return { label: `Atrasada · ${ddmm}`, atrasada: true }
  if (diff === 0) return { label: "Hoje", atrasada: false }
  if (diff === 1) return { label: "Amanhã", atrasada: false }
  return { label: ddmm, atrasada: false }
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

function ConfirmarExclusao({ tarefa, onConfirmar }: { tarefa: Tarefa; onConfirmar: () => void }) {
  const [aberto, setAberto] = useState(false)
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Excluir tarefa"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir tarefa?</DialogTitle>
          <DialogDescription>
            {`A tarefa "${tarefa.titulo}" será removida permanentemente. Esta ação não pode ser desfeita.`}
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
  clientes,
  membros,
  erro,
}: {
  tarefas: Tarefa[]
  clientes: ClienteOpcao[]
  membros: Membro[]
  erro: string | null
}) {
  const [tarefas, setTarefas] = useState(tarefasIniciais)
  const [, startTransition] = useTransition()

  // Filtros
  const [busca, setBusca] = useState("")
  const [filtroResp, setFiltroResp] = useState("")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroPrioridade, setFiltroPrioridade] = useState("")
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false)

  useEffect(() => {
    setTarefas(tarefasIniciais)
  }, [tarefasIniciais])

  const membroPorId = (id: string) => membros.find((m) => m.id === id)
  const clientePorId = (id: string) => clientes.find((c) => c.id === id)

  function toggleConcluida(t: Tarefa) {
    const concluida = t.status !== "concluida"
    // Atualização otimista
    setTarefas((atual) =>
      atual.map((x) => (x.id === t.id ? { ...x, status: concluida ? "concluida" : "pendente" } : x)),
    )
    startTransition(async () => {
      await alternarConclusaoAction(t.id, concluida)
    })
  }

  function removerTarefa(id: string) {
    setTarefas((atual) => atual.filter((x) => x.id !== id))
    startTransition(async () => {
      await excluirTarefaAction(id)
    })
  }

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return tarefas.filter((t) => {
      if (termo && !t.titulo.toLowerCase().includes(termo)) return false
      if (filtroResp && t.responsavelId !== filtroResp) return false
      if (filtroCliente === "__interna" ? t.clienteId !== "" : filtroCliente && t.clienteId !== filtroCliente)
        return false
      if (filtroPrioridade && t.prioridade !== filtroPrioridade) return false
      return true
    })
  }, [tarefas, busca, filtroResp, filtroCliente, filtroPrioridade])

  const pendentes = useMemo(
    () =>
      filtradas
        .filter((t) => t.status !== "concluida")
        .sort((a, b) => {
          const pa = descreverPrazo(a.prazo).atrasada ? 0 : 1
          const pb = descreverPrazo(b.prazo).atrasada ? 0 : 1
          if (pa !== pb) return pa - pb
          if (RANK_PRIORIDADE[a.prioridade] !== RANK_PRIORIDADE[b.prioridade])
            return RANK_PRIORIDADE[a.prioridade] - RANK_PRIORIDADE[b.prioridade]
          return (a.prazo || "9999").localeCompare(b.prazo || "9999")
        }),
    [filtradas],
  )
  const concluidas = useMemo(() => filtradas.filter((t) => t.status === "concluida"), [filtradas])

  const novoTrigger = (
    <Button>
      <Plus className="mr-1.5 h-4 w-4" />
      Nova tarefa
    </Button>
  )

  function LinhaTarefa({ t }: { t: Tarefa }) {
    const concluida = t.status === "concluida"
    const prazo = descreverPrazo(t.prazo)
    const cliente = clientePorId(t.clienteId)
    const resp = membroPorId(t.responsavelId)
    return (
      <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
        <button
          onClick={() => toggleConcluida(t)}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            concluida
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary",
          )}
          aria-label={concluida ? "Marcar como pendente" : "Marcar como concluída"}
        >
          {concluida && <Check className="h-3 w-3" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium text-foreground",
              concluida && "text-muted-foreground line-through",
            )}
          >
            {t.titulo}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {t.status === "fazendo" && !concluida && (
              <span className="rounded-full bg-chart-4/15 px-2 py-0.5 font-medium text-chart-4">Em andamento</span>
            )}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium capitalize",
                prioridadeEstilo[t.prioridade],
              )}
            >
              {prioridadeLabel[t.prioridade]}
            </span>
            <span className={cn(prazo.atrasada && !concluida && "font-medium text-destructive")}>{prazo.label}</span>
            {cliente && <span className="truncate">· {cliente.nome}</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {resp && <Avatarzinho membro={resp} />}
          <TarefaDialog
            clientes={clientes}
            membros={membros}
            tarefa={t}
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
          <ConfirmarExclusao tarefa={t} onConfirmar={() => removerTarefa(t.id)} />
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
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Tarefas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {pendentes.length} {pendentes.length === 1 ? "tarefa pendente" : "tarefas pendentes"}
              {concluidas.length > 0 ? ` · ${concluidas.length} concluída${concluidas.length === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <TarefaDialog
            clientes={clientes}
            membros={membros}
            acao={criarTarefaAction}
            titulo="Nova tarefa"
            descricao="Crie uma tarefa interna ou vinculada a um cliente."
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
            placeholder="Buscar tarefa..."
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
            <option value="__interna">Tarefas internas</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            className={selectClasses}
          >
            <option value="">Todas prioridades</option>
            {PRIORIDADES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de pendentes */}
        <div className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          {pendentes.length > 0 ? (
            <ul className="divide-y divide-border">
              {pendentes.map((t) => (
                <LinhaTarefa key={t.id} t={t} />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <ListChecks className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {tarefas.length === 0
                  ? "Nenhuma tarefa ainda. Crie a primeira no botão acima."
                  : "Nenhuma tarefa pendente com esses filtros."}
              </p>
            </div>
          )}
        </div>

        {/* Concluídas */}
        {concluidas.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setMostrarConcluidas((v) => !v)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {mostrarConcluidas ? "Ocultar" : "Mostrar"} concluídas ({concluidas.length})
            </button>
            {mostrarConcluidas && (
              <div className="mt-3 rounded-xl border border-border bg-card p-5 sm:p-6">
                <ul className="divide-y divide-border">
                  {concluidas.map((t) => (
                    <LinhaTarefa key={t.id} t={t} />
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
