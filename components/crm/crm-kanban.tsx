"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Trash2, TriangleAlert, GripVertical } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ETAPAS_CRM, type EtapaCrm, type Negocio } from "@/lib/crm-types"
import type { Membro } from "@/lib/membros-db"
import { NegocioDialog } from "@/components/crm/negocio-dialog"
import {
  atualizarNegocioAction,
  criarNegocioAction,
  excluirNegocioAction,
  moverNegocioAction,
} from "@/app/(crm)/crm/actions"

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

// Cor da faixa superior de cada coluna do funil.
const corEtapa: Record<EtapaCrm, string> = {
  novo: "bg-muted-foreground/40",
  qualificado: "bg-chart-2",
  proposta: "bg-chart-3",
  negociacao: "bg-chart-5",
  ganho: "bg-chart-4",
  perdido: "bg-destructive",
}

// ── Conteúdo visual do card (compartilhado entre o card real e o overlay) ──
function ConteudoCard({
  n,
  membro,
  acoes,
}: {
  n: Negocio
  membro?: Membro
  acoes?: React.ReactNode
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
          <h3 className="text-pretty text-sm font-medium leading-snug text-foreground">{n.titulo}</h3>
        </div>
        {acoes}
      </div>

      {n.contato && <p className="mt-1.5 pl-5 text-xs text-muted-foreground">{n.contato}</p>}

      <div className="mt-3 flex items-center justify-between pl-5">
        <div className="flex items-center gap-1.5">
          {membro ? (
            <Avatar className="h-6 w-6">
              <AvatarFallback className={cn(membro.cor, "text-[10px] text-primary-foreground")}>
                {membro.iniciais}
              </AvatarFallback>
            </Avatar>
          ) : null}
          {n.origem && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
              {n.origem}
            </span>
          )}
        </div>
        {n.valor > 0 && (
          <span className="text-sm font-semibold tracking-tight text-foreground">{brl(n.valor)}</span>
        )}
      </div>
    </>
  )
}

// ── Card arrastável ─────────────────────────────────────────────────────────
function CardNegocio({
  n,
  membro,
  membros,
  onExcluir,
}: {
  n: Negocio
  membro?: Membro
  membros: Membro[]
  onExcluir: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: n.id })

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "group touch-none rounded-lg border border-border bg-card p-3 shadow-sm transition-opacity",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <ConteudoCard
        n={n}
        membro={membro}
        acoes={
          <div
            className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
            // Impede que toques/cliques nos botões iniciem um arrasto.
            onPointerDown={(e) => e.stopPropagation()}
          >
            <NegocioDialog
              membros={membros}
              negocio={n}
              acao={atualizarNegocioAction}
              titulo="Editar negócio"
              descricao="Atualize os dados desta oportunidade."
              textoBotao="Salvar alterações"
              trigger={
                <button
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Editar negócio"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              }
            />
            <button
              onClick={() => onExcluir(n.id)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Excluir negócio"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />
    </article>
  )
}

// ── Coluna onde se solta ────────────────────────────────────────────────────
function ColunaEtapa({
  etapa,
  children,
  vazia,
}: {
  etapa: { id: EtapaCrm; label: string }
  children: React.ReactNode
  vazia: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl p-2.5 transition-colors",
        isOver && "bg-accent/50 ring-2 ring-inset ring-primary/40",
      )}
    >
      {children}
      {vazia && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 py-8">
          <p className="px-3 text-center text-xs text-muted-foreground">Arraste um card para cá</p>
        </div>
      )}
    </div>
  )
}

export function CrmKanban({
  negocios,
  membros,
  erro,
}: {
  negocios: Negocio[]
  membros: Membro[]
  erro?: string | null
}) {
  const router = useRouter()
  const [itens, setItens] = useState<Negocio[]>(negocios)
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)

  const membroPorId = (id: string) => membros.find((m) => m.id === id)

  // Mouse: arrasta após mover 8px (cliques em botões continuam funcionando).
  // Toque: arrasta após segurar 200ms (toques curtos e rolagem seguem normais).
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const porEtapa = useMemo(() => {
    const mapa = {} as Record<EtapaCrm, Negocio[]>
    for (const e of ETAPAS_CRM) mapa[e.id] = []
    for (const n of itens) mapa[n.etapa]?.push(n)
    return mapa
  }, [itens])

  // Métricas: pipeline aberto = tudo que não foi ganho nem perdido.
  const abertos = itens.filter((n) => n.etapa !== "ganho" && n.etapa !== "perdido")
  const valorPipeline = abertos.reduce((acc, n) => acc + n.valor, 0)
  const valorGanho = itens.filter((n) => n.etapa === "ganho").reduce((acc, n) => acc + n.valor, 0)

  const negocioArrastado = arrastandoId ? itens.find((n) => n.id === arrastandoId) : null

  function aoIniciar(e: DragStartEvent) {
    setArrastandoId(String(e.active.id))
  }

  async function aoSoltar(e: DragEndEvent) {
    const id = String(e.active.id)
    setArrastandoId(null)
    const destino = e.over?.id as EtapaCrm | undefined
    if (!destino) return
    const atual = itens.find((n) => n.id === id)
    if (!atual || atual.etapa === destino) return

    // Atualização otimista: move o card na hora e persiste no banco em seguida.
    setItens((prev) => prev.map((n) => (n.id === id ? { ...n, etapa: destino } : n)))
    const res = await moverNegocioAction(id, destino)
    if (!res.ok) {
      setItens((prev) => prev.map((n) => (n.id === id ? { ...n, etapa: atual.etapa } : n)))
    }
    router.refresh()
  }

  async function excluir(id: string) {
    setItens((prev) => prev.filter((n) => n.id !== id))
    await excluirNegocioAction(id)
    router.refresh()
  }

  return (
    <main className="flex-1 overflow-hidden bg-background">
      <div className="flex h-full flex-col px-4 py-6 md:px-6 md:py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">CRM · Funil comercial</h2>
            <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
              {abertos.length} negócios em aberto · {brl(valorPipeline)} no pipeline · {brl(valorGanho)} ganhos
            </p>
          </div>
          <NegocioDialog
            membros={membros}
            acao={criarNegocioAction}
            titulo="Novo negócio"
            descricao="Cadastre uma oportunidade no funil comercial. Será salva no banco da SIMPLE."
            textoBotao="Salvar negócio"
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo negócio
              </Button>
            }
          />
        </div>

        {erro && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Não foi possível conectar ao banco de dados</p>
              <p className="mt-0.5 text-pretty leading-relaxed text-muted-foreground">{erro}</p>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground md:hidden">
          Dica: segure um card por um instante para arrastá-lo entre as etapas.
        </p>

        {/* Kanban */}
        <DndContext
          sensors={sensores}
          collisionDetection={pointerWithin}
          onDragStart={aoIniciar}
          onDragEnd={aoSoltar}
          onDragCancel={() => setArrastandoId(null)}
        >
          <div className="mt-4 flex flex-1 gap-4 overflow-x-auto pb-2">
            {ETAPAS_CRM.map((etapa) => {
              const lista = porEtapa[etapa.id] ?? []
              const total = lista.reduce((acc, n) => acc + n.valor, 0)
              return (
                <div
                  key={etapa.id}
                  className="flex w-[80vw] max-w-[20rem] shrink-0 flex-col rounded-xl border border-border bg-card/50"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", corEtapa[etapa.id])} />
                      <span className="text-sm font-medium text-foreground">{etapa.label}</span>
                      <span className="rounded-full bg-secondary px-1.5 text-xs text-secondary-foreground">
                        {lista.length}
                      </span>
                    </div>
                    <NegocioDialog
                      membros={membros}
                      etapaInicial={etapa.id}
                      acao={criarNegocioAction}
                      titulo={`Novo negócio · ${etapa.label}`}
                      descricao="Cadastre uma oportunidade nesta etapa do funil."
                      textoBotao="Salvar negócio"
                      trigger={
                        <button
                          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label={`Adicionar negócio em ${etapa.label}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      }
                    />
                  </div>

                  <ColunaEtapa etapa={etapa} vazia={lista.length === 0}>
                    {total > 0 && (
                      <p className="px-0.5 text-[11px] font-medium text-muted-foreground">{brl(total)} no total</p>
                    )}
                    {lista.map((n) => (
                      <CardNegocio
                        key={n.id}
                        n={n}
                        membro={membroPorId(n.responsavelId)}
                        membros={membros}
                        onExcluir={excluir}
                      />
                    ))}
                  </ColunaEtapa>
                </div>
              )
            })}
          </div>

          {/* Card que segue o dedo/cursor enquanto arrasta */}
          <DragOverlay dropAnimation={null}>
            {negocioArrastado ? (
              <article className="w-72 max-w-[80vw] cursor-grabbing rounded-lg border border-primary/40 bg-card p-3 shadow-lg">
                <ConteudoCard n={negocioArrastado} membro={membroPorId(negocioArrastado.responsavelId)} />
              </article>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </main>
  )
}
