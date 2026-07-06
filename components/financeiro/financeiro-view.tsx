"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Topbar } from "@/components/simple/topbar"
import { LancamentoDialog, type ClienteOpcao } from "@/components/financeiro/lancamento-dialog"
import {
  atualizarLancamentoAction,
  criarLancamentoAction,
  excluirLancamentoAction,
  salvarMetaAction,
} from "@/app/(crm)/financeiro/actions"
import {
  brl,
  deslocarMes,
  rotuloMes,
  type Lancamento,
  type ResumoFinanceiro,
} from "@/lib/financeiro-types"

export function FinanceiroView({
  resumo,
  lancamentos,
  clientes,
  erro,
}: {
  resumo: ResumoFinanceiro
  lancamentos: Lancamento[]
  clientes: ClienteOpcao[]
  erro?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [filtroTipo, setFiltroTipo] = useState<"" | "receita" | "custo">("")

  // Navegação de mês: atualiza ?mes= e o servidor rebusca os dados
  function irPara(mes: string) {
    startTransition(() => router.push(`/financeiro?mes=${mes}`))
  }

  const receitas = useMemo(() => lancamentos.filter((l) => l.tipo === "receita"), [lancamentos])
  const custos = useMemo(() => lancamentos.filter((l) => l.tipo === "custo"), [lancamentos])
  const visiveis = useMemo(
    () => (filtroTipo ? lancamentos.filter((l) => l.tipo === filtroTipo) : lancamentos),
    [lancamentos, filtroTipo],
  )

  function excluir(id: string) {
    startTransition(async () => {
      await excluirLancamentoAction(id)
      router.refresh()
    })
  }

  return (
    <>
      <Topbar titulo="Financeiro" />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Cabeçalho + navegação de mês */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Visão financeira</h2>
            <p className="text-sm text-muted-foreground">Receita, custos e lucro do mês</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-1 py-1">
              <button
                onClick={() => irPara(deslocarMes(resumo.mes, -1))}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-32 text-center text-sm font-medium text-foreground">{rotuloMes(resumo.mes)}</span>
              <button
                onClick={() => irPara(deslocarMes(resumo.mes, 1))}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <LancamentoDialog
              clientes={clientes}
              mes={resumo.mes}
              acao={criarLancamentoAction}
              titulo="Novo lançamento"
              descricao="Registre uma receita avulsa ou um custo do negócio."
              textoBotao="Adicionar lançamento"
              trigger={
                <Button className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Novo lançamento
                </Button>
              }
            />
          </div>
        </div>

        {erro && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {`Não foi possível carregar do banco: ${erro}`}
          </p>
        )}

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Receita */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Receita total</span>
              <TrendingUp className="h-4 w-4 text-chart-2" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{brl(resumo.receitaTotal)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              MRR {brl(resumo.receitaMrr)}
              {resumo.receitaAvulsa > 0 ? ` + ${brl(resumo.receitaAvulsa)} avulsos` : ""}
              {resumo.receitaLancamentos > 0 ? ` + ${brl(resumo.receitaLancamentos)} lançados` : ""}
            </p>
          </div>

          {/* Custos */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Custos</span>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{brl(resumo.custoTotal)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{custos.length} lançamento(s)</p>
          </div>

          {/* Lucro */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lucro</span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p
              className={cn(
                "mt-3 text-2xl font-semibold tracking-tight",
                resumo.lucro >= 0 ? "text-foreground" : "text-destructive",
              )}
            >
              {brl(resumo.lucro)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Margem de {resumo.margem}%</p>
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Meta do mês</span>
              <MetaDialog mes={resumo.mes} valorAtual={resumo.meta} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{brl(resumo.meta)}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${resumo.progressoMeta}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{resumo.progressoMeta}% da meta atingida</p>
          </div>
        </div>

        {/* Filtro */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Lançamentos do mês</h3>
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            {(
              [
                { id: "", label: "Todos" },
                { id: "receita", label: "Receitas" },
                { id: "custo", label: "Custos" },
              ] as const
            ).map((op) => (
              <button
                key={op.id}
                onClick={() => setFiltroTipo(op.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  filtroTipo === op.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de lançamentos */}
        <div className={cn("mt-3 rounded-xl border border-border bg-card", pending && "opacity-60")}>
          {visiveis.length > 0 ? (
            <ul className="divide-y divide-border">
              {visiveis.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      l.tipo === "receita" ? "bg-chart-2/15 text-chart-2" : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {l.tipo === "receita" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{l.descricao}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[l.categoria, l.empresaNome, l.recorrente ? "Recorrente" : null].filter(Boolean).join(" · ") ||
                        "Sem categoria"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      l.tipo === "receita" ? "text-chart-2" : "text-destructive",
                    )}
                  >
                    {l.tipo === "receita" ? "+" : "-"}
                    {brl(l.valor)}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <LancamentoDialog
                      clientes={clientes}
                      mes={resumo.mes}
                      lancamento={l}
                      acao={atualizarLancamentoAction}
                      titulo="Editar lançamento"
                      descricao="Atualize os dados deste lançamento."
                      textoBotao="Salvar alterações"
                      trigger={
                        <button
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      }
                    />
                    <ConfirmarExclusao onConfirmar={() => excluir(l.id)} descricao={l.descricao} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {lancamentos.length === 0
                  ? "Nenhum lançamento neste mês. Adicione receitas avulsas ou custos no botão acima."
                  : "Nenhum lançamento com esse filtro."}
              </p>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          A receita recorrente (MRR) e os pagamentos avulsos vêm automaticamente do cadastro dos clientes — o avulso
          entra na receita do mês em que o cliente foi cadastrado. Use os lançamentos para custos e receitas extras.
        </p>
        {/* Espaço reservado para os totais detalhados */}
        {(receitas.length > 0 || custos.length > 0) && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Receitas lançadas no mês: </span>
              <span className="font-semibold text-chart-2">{brl(resumo.receitaLancamentos)}</span>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Custos do mês: </span>
              <span className="font-semibold text-destructive">{brl(resumo.custoTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Diálogo de edição da meta do mês
function MetaDialog({ mes, valorAtual }: { mes: string; valorAtual: number }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState(String(valorAtual || ""))
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function salvar() {
    const n = Number(valor.replace(/\./g, "").replace(",", "."))
    if (!Number.isFinite(n) || n < 0) {
      setErro("Informe um valor válido.")
      return
    }
    startTransition(async () => {
      const r = await salvarMetaAction(mes, n)
      if (r.ok) {
        setAberto(false)
        setErro(null)
        router.refresh()
      } else {
        setErro(r.erro ?? "Erro ao salvar.")
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <button
          className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Editar meta"
        >
          <Target className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meta de {rotuloMes(mes)}</DialogTitle>
          <DialogDescription>Defina a meta de receita para este mês.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="meta">Meta (R$)</Label>
          <Input
            id="meta"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
          />
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter className="mt-2">
          <Button onClick={salvar} disabled={pending}>
            {pending ? "Salvando..." : "Salvar meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Confirmação de exclusão reutilizando o Dialog
function ConfirmarExclusao({ onConfirmar, descricao }: { onConfirmar: () => void; descricao: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir lançamento?</DialogTitle>
          <DialogDescription>
            {`O lançamento "${descricao}" será removido permanentemente. Esta ação não pode ser desfeita.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onConfirmar}>
              Excluir
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
