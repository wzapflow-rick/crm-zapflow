"use client"

import { useMemo, useState } from "react"
import {
  GripVertical,
  Phone,
  TrendingUp,
  Trophy,
  Users2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/crm/providers"
import {
  etapas,
  formatarBRL,
  type Negocio,
  type Membro,
  type EtapaId,
} from "@/lib/zapflow-data"
import { moverNegocio } from "@/app/actions/crm"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function Pipeline({
  negociosIniciais,
  membros,
}: {
  negociosIniciais: Negocio[]
  membros: Membro[]
}) {
  const { usuario, isAdmin } = useApp()
  const [negocios, setNegocios] = useState<Negocio[]>(negociosIniciais)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobreEtapa, setSobreEtapa] = useState<EtapaId | null>(null)

  const membroPorId = (id: string | null) =>
    id ? membros.find((m) => m.id === id) : undefined

  // Atendente vê apenas os próprios negócios; admin vê todos.
  const visiveis = useMemo(
    () => (isAdmin ? negocios : negocios.filter((n) => n.responsavelId === usuario.id)),
    [negocios, isAdmin, usuario.id],
  )

  const ativos = visiveis.filter((n) => n.etapa !== "perdido")
  const emAberto = ativos.filter((n) => n.etapa !== "ganho")
  const valorEmAberto = emAberto.reduce((acc, n) => acc + n.valor, 0)
  const ganhos = visiveis.filter((n) => n.etapa === "ganho")
  const valorGanho = ganhos.reduce((acc, n) => acc + n.valor, 0)
  const fechados = ganhos.length + visiveis.filter((n) => n.etapa === "perdido").length
  const taxaConversao = fechados > 0 ? Math.round((ganhos.length / fechados) * 100) : 0

  function moverPara(etapa: EtapaId) {
    if (!arrastando) return
    const id = arrastando
    setNegocios((prev) =>
      prev.map((n) => (n.id === id ? { ...n, etapa } : n)),
    )
    setArrastando(null)
    setSobreEtapa(null)
    const titulo = etapas.find((e) => e.id === etapa)?.titulo
    if (titulo) void moverNegocio(id, titulo)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho + KPIs */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Pipeline de vendas</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Funil de toda a equipe — arraste os cartões entre as etapas"
                : "Seus negócios — arraste os cartões entre as etapas"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Kpi
              icon={Users2}
              rotulo="Em aberto"
              valor={`${emAberto.length}`}
              sub={formatarBRL(valorEmAberto)}
            />
            <Kpi
              icon={Trophy}
              rotulo="Ganhos"
              valor={`${ganhos.length}`}
              sub={formatarBRL(valorGanho)}
            />
            <Kpi
              icon={TrendingUp}
              rotulo="Conversão"
              valor={`${taxaConversao}%`}
              sub="negócios fechados"
            />
          </div>
        </div>
      </div>

      {/* Quadro Kanban */}
      <div className="flex-1 overflow-x-auto bg-background p-4">
        <div className="flex h-full min-w-max gap-3">
          {etapas.map((etapa) => {
            const cards = visiveis.filter((n) => n.etapa === etapa.id)
            const total = cards.reduce((acc, n) => acc + n.valor, 0)
            const ativa = sobreEtapa === etapa.id
            return (
              <div
                key={etapa.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  setSobreEtapa(etapa.id)
                }}
                onDragLeave={() => setSobreEtapa((s) => (s === etapa.id ? null : s))}
                onDrop={() => moverPara(etapa.id)}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-lg border bg-card transition-colors",
                  ativa ? "border-primary ring-2 ring-primary/30" : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", etapa.cor)} />
                    <span className="text-sm font-medium text-foreground">{etapa.titulo}</span>
                    <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                      {cards.length}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatarBRL(total)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {cards.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                      Arraste negócios para cá
                    </div>
                  )}
                  {cards.map((n) => (
                    <CartaoNegocio
                      key={n.id}
                      negocio={n}
                      responsavel={membroPorId(n.responsavelId)}
                      arrastando={arrastando === n.id}
                      onDragStart={() => setArrastando(n.id)}
                      onDragEnd={() => {
                        setArrastando(null)
                        setSobreEtapa(null)
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Kpi({
  icon: Icon,
  rotulo,
  valor,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  rotulo: string
  valor: string
  sub: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
        <p className="text-sm font-semibold text-foreground">
          {valor} <span className="font-normal text-muted-foreground">· {sub}</span>
        </p>
      </div>
    </div>
  )
}

function CartaoNegocio({
  negocio,
  responsavel,
  arrastando,
  onDragStart,
  onDragEnd,
}: {
  negocio: Negocio
  responsavel: Membro | undefined
  arrastando: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group cursor-grab rounded-md border border-border bg-card p-3 shadow-sm transition-all active:cursor-grabbing hover:border-primary/50",
        arrastando && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className={cn("text-[10px] font-medium text-primary-foreground", negocio.cor)}>
              {negocio.iniciais}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium text-foreground">{negocio.empresa}</p>
            <p className="text-xs text-muted-foreground">{negocio.contato}</p>
          </div>
        </div>
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {formatarBRL(negocio.valor)}
          <span className="text-xs font-normal text-muted-foreground">/mês</span>
        </span>
        <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
          <Phone className="h-3 w-3" />
          {negocio.origem}
        </Badge>
      </div>

      {negocio.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {negocio.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={cn("h-4 w-4 rounded-full text-[8px] flex items-center justify-center font-medium text-primary-foreground", responsavel?.cor)}>
            {responsavel?.iniciais}
          </span>
          {responsavel?.nome.replace(" (Admin)", "")}
        </span>
        <span className="text-[11px] text-muted-foreground">{negocio.atualizadoEm}</span>
      </div>
    </div>
  )
}
