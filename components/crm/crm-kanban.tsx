"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Trash2, TriangleAlert, GripVertical } from "lucide-react"
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
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<EtapaCrm | null>(null)

  const membroPorId = (id: string) => membros.find((m) => m.id === id)

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

  async function soltarEm(etapa: EtapaCrm) {
    const id = arrastando
    setArrastando(null)
    setSobre(null)
    if (!id) return
    const atual = itens.find((n) => n.id === id)
    if (!atual || atual.etapa === etapa) return

    // Atualização otimista: move o card na hora e persiste no banco em seguida.
    setItens((prev) => prev.map((n) => (n.id === id ? { ...n, etapa } : n)))
    const res = await moverNegocioAction(id, etapa)
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
      <div className="flex h-full flex-col px-6 py-8">
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

        {/* Kanban */}
        <div className="mt-6 flex flex-1 gap-4 overflow-x-auto pb-2">
          {ETAPAS_CRM.map((etapa) => {
            const lista = porEtapa[etapa.id] ?? []
            const total = lista.reduce((acc, n) => acc + n.valor, 0)
            return (
              <div
                key={etapa.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  setSobre(etapa.id)
                }}
                onDragLeave={() => setSobre((s) => (s === etapa.id ? null : s))}
                onDrop={() => soltarEm(etapa.id)}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border bg-card/50 transition-colors",
                  sobre === etapa.id ? "border-primary/50 bg-accent/40" : "border-border",
                )}
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

                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                  {total > 0 && (
                    <p className="px-0.5 text-[11px] font-medium text-muted-foreground">{brl(total)} no total</p>
                  )}
                  {lista.map((n) => {
                    const resp = membroPorId(n.responsavelId)
                    return (
                      <article
                        key={n.id}
                        draggable
                        onDragStart={() => setArrastando(n.id)}
                        onDragEnd={() => setArrastando(null)}
                        className={cn(
                          "group cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-all active:cursor-grabbing",
                          arrastando === n.id && "opacity-50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-1.5">
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                            <h3 className="text-pretty text-sm font-medium leading-snug text-foreground">
                              {n.titulo}
                            </h3>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
                              onClick={() => excluir(n.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Excluir negócio"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {n.contato && <p className="mt-1.5 pl-5 text-xs text-muted-foreground">{n.contato}</p>}

                        <div className="mt-3 flex items-center justify-between pl-5">
                          <div className="flex items-center gap-1.5">
                            {resp ? (
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className={cn(resp.cor, "text-[10px] text-primary-foreground")}>
                                  {resp.iniciais}
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
                      </article>
                    )
                  })}

                  {lista.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 py-8">
                      <p className="px-3 text-center text-xs text-muted-foreground">Arraste um card para cá</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
