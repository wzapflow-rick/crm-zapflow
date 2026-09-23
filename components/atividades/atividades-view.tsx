"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  History,
  Users,
  ListChecks,
  KanbanSquare,
  Wallet,
  Sparkles,
  CalendarDays,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { tempoRelativo, type Atividade } from "@/lib/atividades-db"
import { cn } from "@/lib/utils"

type ModuloMeta = { rotulo: string; icon: LucideIcon }

const MODULOS: Record<string, ModuloMeta> = {
  clientes: { rotulo: "Clientes", icon: Users },
  tarefas: { rotulo: "Tarefas", icon: ListChecks },
  crm: { rotulo: "CRM", icon: KanbanSquare },
  financeiro: { rotulo: "Financeiro", icon: Wallet },
  conteudo: { rotulo: "Conteúdo", icon: Sparkles },
  calendario: { rotulo: "Calendário", icon: CalendarDays },
  equipe: { rotulo: "Equipe", icon: UserCog },
}

const ACOES: Record<string, { icon: LucideIcon; classe: string }> = {
  criar: { icon: Plus, classe: "text-emerald-600 dark:text-emerald-400" },
  atualizar: { icon: Pencil, classe: "text-amber-600 dark:text-amber-400" },
  excluir: { icon: Trash2, classe: "text-rose-600 dark:text-rose-400" },
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

export function AtividadesView({
  atividades,
  membros,
  filtroMembro,
  filtroModulo,
}: {
  atividades: Atividade[]
  membros: { id: string; nome: string }[]
  filtroMembro: string
  filtroModulo: string
}) {
  const router = useRouter()
  const params = useSearchParams()

  function atualizarFiltro(chave: "membro" | "modulo", valor: string) {
    const p = new URLSearchParams(params.toString())
    if (valor) p.set(chave, valor)
    else p.delete(chave)
    router.push(`/atividades${p.toString() ? `?${p.toString()}` : ""}`)
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-tight text-balance">Atividades</h1>
          <p className="text-sm text-muted-foreground">
            Registro de quem alterou o quê no sistema, em ordem cronológica.
          </p>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <select
          value={filtroMembro}
          onChange={(e) => atualizarFiltro("membro", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filtrar por pessoa"
        >
          <option value="">Todas as pessoas</option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>

        <select
          value={filtroModulo}
          onChange={(e) => atualizarFiltro("modulo", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filtrar por módulo"
        >
          <option value="">Todos os módulos</option>
          {Object.entries(MODULOS).map(([chave, meta]) => (
            <option key={chave} value={chave}>
              {meta.rotulo}
            </option>
          ))}
        </select>
      </div>

      {atividades.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            As alterações feitas no sistema aparecerão aqui.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-1">
          {atividades.map((a) => {
            const modulo = MODULOS[a.modulo]
            const acao = ACOES[a.acao] ?? ACOES.atualizar
            const AcaoIcon = acao.icon
            const ModuloIcon = modulo?.icon ?? History
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                  {iniciais(a.membroNome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{a.membroNome}</span>{" "}
                    <span className="text-muted-foreground">{a.descricao}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/70">
                    <span className="inline-flex items-center gap-1">
                      <ModuloIcon className="h-3.5 w-3.5" />
                      {modulo?.rotulo ?? a.modulo}
                    </span>
                    <span className={cn("inline-flex items-center gap-1", acao.classe)}>
                      <AcaoIcon className="h-3.5 w-3.5" />
                      {a.acao === "criar" ? "criou" : a.acao === "excluir" ? "removeu" : "editou"}
                    </span>
                    <span title={new Date(a.criadoEm).toLocaleString("pt-BR")}>
                      {tempoRelativo(a.criadoEm)}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
