"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Plus, Sparkles, Trash2 } from "lucide-react"
import {
  Dialog,
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  salvarEstrategiaMensalAction,
  gerarEstrategiaMensalAction,
} from "@/app/(crm)/clientes/estrategia-mensal-actions"
import type {
  CampanhaMensal,
  EstrategiaMensal,
  KpiMensal,
  StatusEstrategiaMensal,
} from "@/lib/estrategia-mensal-db"

const STATUS_OPCOES: { valor: StatusEstrategiaMensal; label: string }[] = [
  { valor: "planejado", label: "Planejado" },
  { valor: "em_andamento", label: "Em andamento" },
  { valor: "concluido", label: "Concluído" },
]

function competenciaAtual(): string {
  return new Date().toISOString().slice(0, 7)
}

export function EstrategiaMensalDialog({
  clienteId,
  registro,
  competenciasExistentes,
  trigger,
}: {
  clienteId: string
  registro?: EstrategiaMensal
  competenciasExistentes: string[]
  trigger: ReactNode
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState("")
  const [instrucao, setInstrucao] = useState("")

  const [competencia, setCompetencia] = useState(registro?.competencia ?? competenciaAtual())
  const [objetivo, setObjetivo] = useState(registro?.objetivo ?? "")
  const [pilares, setPilares] = useState(registro?.pilares.join("\n") ?? "")
  const [campanhas, setCampanhas] = useState<CampanhaMensal[]>(registro?.campanhas ?? [])
  const [kpis, setKpis] = useState<KpiMensal[]>(registro?.kpis ?? [])
  const [calendarioResumo, setCalendarioResumo] = useState(registro?.calendarioResumo ?? "")
  const [retrospectiva, setRetrospectiva] = useState(registro?.retrospectiva ?? "")
  const [status, setStatus] = useState<StatusEstrategiaMensal>(registro?.status ?? "planejado")

  const edicao = Boolean(registro)

  useEffect(() => {
    if (aberto) {
      setErro("")
      setInstrucao("")
      setCompetencia(registro?.competencia ?? competenciaAtual())
      setObjetivo(registro?.objetivo ?? "")
      setPilares(registro?.pilares.join("\n") ?? "")
      setCampanhas(registro?.campanhas ?? [])
      setKpis(registro?.kpis ?? [])
      setCalendarioResumo(registro?.calendarioResumo ?? "")
      setRetrospectiva(registro?.retrospectiva ?? "")
      setStatus(registro?.status ?? "planejado")
    }
  }, [aberto, registro])

  const gerarComIa = async () => {
    setGerando(true)
    setErro("")
    try {
      const r = await gerarEstrategiaMensalAction({ clienteId, competencia, instrucao })
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      setObjetivo(r.plano.objetivo)
      setPilares(r.plano.pilares.join("\n"))
      setCampanhas(r.plano.campanhas)
      // Mantém o realizado vazio: alvo vem da IA, realizado é preenchido ao longo do mês.
      setKpis(r.plano.kpis.map((k) => ({ rotulo: k.rotulo, alvo: k.alvo, realizado: "" })))
      setCalendarioResumo(r.plano.calendarioResumo)
    } catch {
      setErro("Não foi possível gerar a estratégia agora. Tente novamente.")
    } finally {
      setGerando(false)
    }
  }

  const salvar = async () => {
    setSalvando(true)
    setErro("")
    try {
      const r = await salvarEstrategiaMensalAction({
        clienteId,
        competencia,
        objetivo,
        pilares: pilares.split("\n").map((s) => s.trim()).filter(Boolean),
        campanhas,
        kpis,
        calendarioResumo,
        retrospectiva,
        status,
      })
      if (!r.ok) {
        setErro(r.erro ?? "Não foi possível salvar.")
        return
      }
      setAberto(false)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  // Impede sobrescrever, sem querer, outro mês já cadastrado (exceto o que está em edição).
  const conflitoCompetencia =
    !edicao && competenciasExistentes.includes(competencia)

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar estratégia do mês" : "Nova estratégia mensal"}</DialogTitle>
          <DialogDescription>
            Defina o plano do mês e acompanhe o realizado. Você pode gerar um rascunho com IA e ajustar antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {/* Gerador com IA */}
          <div className="grid gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <Label className="text-primary">Gerar rascunho com IA</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Usa o contexto do cliente para propor objetivo, pilares, campanhas, KPIs e ritmo do mês.
            </p>
            <div className="flex items-start gap-2">
              <Textarea
                value={instrucao}
                onChange={(e) => setInstrucao(e.target.value)}
                rows={2}
                placeholder="Foco ou contexto deste mês (opcional): lançamento, sazonalidade, meta específica..."
                className="field-sizing-fixed resize-y bg-background"
              />
              <Button type="button" onClick={gerarComIa} disabled={gerando} className="shrink-0 gap-1.5">
                <Sparkles className="h-4 w-4" />
                {gerando ? "Gerando..." : "Gerar"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="competencia">Mês</Label>
              <Input
                id="competencia"
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                disabled={edicao}
              />
              {conflitoCompetencia && (
                <p className="text-xs text-chart-5">Já existe um plano para este mês. Salvar vai sobrescrevê-lo.</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusEstrategiaMensal)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {STATUS_OPCOES.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="objetivo">Objetivo do mês</Label>
            <Textarea
              id="objetivo"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              rows={2}
              placeholder="Ex.: Gerar 10 reuniões qualificadas com conteúdo de autoridade."
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pilares">Pilares de conteúdo (um por linha)</Label>
            <Textarea
              id="pilares"
              value={pilares}
              onChange={(e) => setPilares(e.target.value)}
              rows={3}
              placeholder={"Ex.: Bastidores de obra\nEducação sobre sustentabilidade\nProva social"}
            />
          </div>

          {/* Campanhas */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Campanhas / séries</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setCampanhas((c) => [...c, { nome: "", descricao: "" }])}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
            {campanhas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma campanha. Adicione ou gere com IA.</p>
            ) : (
              <div className="grid gap-2">
                {campanhas.map((c, i) => (
                  <div key={i} className="grid gap-1.5 rounded-md border border-border p-2.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={c.nome}
                        onChange={(e) =>
                          setCampanhas((arr) => arr.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))
                        }
                        placeholder="Nome da campanha"
                        className="h-8"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setCampanhas((arr) => arr.filter((_, j) => j !== i))}
                        aria-label="Remover campanha"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={c.descricao}
                      onChange={(e) =>
                        setCampanhas((arr) => arr.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))
                      }
                      rows={2}
                      placeholder="O que é e como se conecta ao objetivo."
                      className="field-sizing-fixed resize-y text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPIs planejado x realizado */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>KPIs (meta e realizado)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setKpis((k) => [...k, { rotulo: "", alvo: "", realizado: "" }])}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
            {kpis.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum KPI. Adicione ou gere com IA.</p>
            ) : (
              <div className="grid gap-2">
                <div className="grid grid-cols-[1fr_5rem_5rem_2rem] items-center gap-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Indicador</span>
                  <span>Meta</span>
                  <span>Realizado</span>
                  <span className="sr-only">Remover</span>
                </div>
                {kpis.map((k, i) => (
                  <div key={i} className="grid grid-cols-[1fr_5rem_5rem_2rem] items-center gap-2">
                    <Input
                      value={k.rotulo}
                      onChange={(e) => setKpis((arr) => arr.map((x, j) => (j === i ? { ...x, rotulo: e.target.value } : x)))}
                      placeholder="Ex.: Alcance"
                      className="h-8"
                    />
                    <Input
                      value={k.alvo}
                      onChange={(e) => setKpis((arr) => arr.map((x, j) => (j === i ? { ...x, alvo: e.target.value } : x)))}
                      placeholder="Meta"
                      className="h-8"
                    />
                    <Input
                      value={k.realizado}
                      onChange={(e) =>
                        setKpis((arr) => arr.map((x, j) => (j === i ? { ...x, realizado: e.target.value } : x)))
                      }
                      placeholder="—"
                      className="h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setKpis((arr) => arr.filter((_, j) => j !== i))}
                      aria-label="Remover KPI"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="calendario">Ritmo / calendário do mês</Label>
            <Textarea
              id="calendario"
              value={calendarioResumo}
              onChange={(e) => setCalendarioResumo(e.target.value)}
              rows={2}
              placeholder="Ex.: 3 Reels/semana, 1 carrossel/semana, campanha na 2ª quinzena."
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="retrospectiva">Retrospectiva (ao fechar o mês)</Label>
            <Textarea
              id="retrospectiva"
              value={retrospectiva}
              onChange={(e) => setRetrospectiva(e.target.value)}
              rows={3}
              placeholder="O que funcionou, o que não saiu como planejado e o que levar para o próximo mês."
            />
          </div>

          {erro && <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{erro}</p>}
        </div>

        <DialogFooter className="mt-1">
          <Button type="button" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar estratégia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
