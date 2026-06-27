"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Plus, Search, TriangleAlert, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { type Cliente, type StatusCliente } from "@/lib/simple-data"
import type { Membro } from "@/lib/membros-db"
import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog"
import { ExcluirClienteButton } from "@/components/clientes/excluir-cliente-button"
import { criarClienteAction } from "@/app/(crm)/clientes/actions"

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

const statusInfo: Record<StatusCliente, { label: string; classe: string }> = {
  ativo: { label: "Ativo", classe: "bg-chart-4/15 text-chart-4" },
  onboarding: { label: "Onboarding", classe: "bg-primary/10 text-primary" },
  pausado: { label: "Pausado", classe: "bg-muted text-muted-foreground" },
}

type Filtro = "todos" | StatusCliente | "avulso"

const filtros: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "ativo", label: "Ativos" },
  { id: "onboarding", label: "Onboarding" },
  { id: "pausado", label: "Pausados" },
  { id: "avulso", label: "Avulsos" },
]

// Badge do cartão: clientes avulsos têm rótulo próprio, sobrepondo o status.
const badgeAvulso = { label: "Avulso", classe: "bg-chart-3/15 text-chart-3" }

export function ClientesLista({
  clientes,
  membros,
  erro,
}: {
  clientes: Cliente[]
  membros: Membro[]
  erro?: string | null
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [busca, setBusca] = useState("")

  const membroPorId = (id: string) => membros.find((m) => m.id === id)

  const visiveis = clientes.filter((c) => {
    // Avulsos formam um bucket próprio: aparecem só em "Todos" e "Avulsos".
    let passaFiltro: boolean
    if (filtro === "todos") passaFiltro = true
    else if (filtro === "avulso") passaFiltro = !c.recorrente
    else passaFiltro = c.recorrente && c.status === filtro
    const passaBusca =
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.segmento.toLowerCase().includes(busca.toLowerCase())
    return passaFiltro && passaBusca
  })

  const ativos = clientes.filter((c) => c.recorrente && c.status === "ativo").length
  const avulsos = clientes.filter((c) => !c.recorrente).length
  // Receita recorrente considera apenas clientes recorrentes (avulsos não somam ao MRR).
  const mrrTotal = clientes.reduce((acc, c) => acc + (c.recorrente ? c.mrr : 0), 0)

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Clientes</h2>
            <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
              {clientes.length} clientes · {ativos} ativos · {avulsos} avulsos · {brl(mrrTotal)} em receita recorrente
            </p>
          </div>
          <ClienteFormDialog
            membros={membros}
            acao={criarClienteAction}
            titulo="Novo cliente"
            descricao="Cadastre um cliente. Ele será salvo no banco de dados da SIMPLE."
            textoBotao="Salvar cliente"
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo cliente
              </Button>
            }
          />
        </div>

        {/* Aviso de conexão */}
        {erro && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Não foi possível conectar ao banco de dados</p>
              <p className="mt-0.5 text-pretty leading-relaxed text-muted-foreground">{erro}</p>
            </div>
          </div>
        )}

        {/* Filtros + busca */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {filtros.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filtro === f.id
                    ? "bg-foreground text-background"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente ou segmento..."
              className="h-9 bg-card pl-9 text-sm"
            />
          </div>
        </div>

        {/* Grid de clientes */}
        {visiveis.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiveis.map((c) => {
              const responsaveis = (c.responsaveisIds ?? []).map(membroPorId).filter(Boolean) as Membro[]
              return (
                <Link
                  key={c.id}
                  href={`/clientes/${c.id}`}
                  className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between">
                    <Avatar className="h-11 w-11">
                      {c.logoUrl && <AvatarImage src={c.logoUrl || "/placeholder.svg"} alt={`Logo ${c.nome}`} className="object-cover" />}
                      <AvatarFallback className={cn(c.cor, "text-sm font-medium text-primary-foreground")}>
                        {c.iniciais}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        c.recorrente ? statusInfo[c.status].classe : badgeAvulso.classe,
                      )}
                    >
                      {c.recorrente ? statusInfo[c.status].label : badgeAvulso.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5">
                    <h3 className="text-base font-semibold tracking-tight text-foreground">{c.nome}</h3>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.segmento}</p>

                  <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-pretty text-sm leading-snug text-muted-foreground">
                    {c.objetivo || "Sem objetivo definido."}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex min-w-0 items-center gap-2">
                      {responsaveis.length > 0 ? (
                        <>
                          <div className="flex -space-x-1.5">
                            {responsaveis.map((r) => (
                              <Avatar key={r.id} className="h-6 w-6 ring-2 ring-card" title={r.nome}>
                                <AvatarFallback className={cn(r.cor, "text-[10px] text-primary-foreground")}>
                                  {r.iniciais}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span className="truncate text-xs text-muted-foreground">
                            {responsaveis.length === 1 ? responsaveis[0].nome : `${responsaveis.length} responsáveis`}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem responsável</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {c.mrr > 0 ? (c.recorrente ? `${brl(c.mrr)}/mês` : brl(c.mrr)) : "—"}
                      </span>
                      <ExcluirClienteButton clienteId={c.id} clienteNome={c.nome} variant="icone" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {clientes.length === 0 && !erro
                ? "Nenhum cliente cadastrado ainda. Crie o primeiro com o botão acima."
                : "Nenhum cliente encontrado com esses filtros."}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
