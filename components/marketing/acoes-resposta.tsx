"use client"

import { useState } from "react"
import { CalendarPlus, CheckCircle2, FileText, FlaskConical, ListTodo, Loader2, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  extrairAcaoIA,
  aplicarAcaoIA,
  type TipoAcaoIA,
} from "@/app/(crm)/marketing/acoes-ia-actions"

type AcaoDef = { tipo: TipoAcaoIA; rotulo: string; Icone: typeof FileText }

const ACOES: AcaoDef[] = [
  { tipo: "conteudos", rotulo: "Criar conteúdos", Icone: FileText },
  { tipo: "calendario", rotulo: "Add ao calendário", Icone: CalendarPlus },
  { tipo: "tarefas", rotulo: "Criar tarefas", Icone: ListTodo },
  { tipo: "estrategia", rotulo: "Salvar estratégia", Icone: Sparkles },
  { tipo: "experimento", rotulo: "Criar experimento", Icone: FlaskConical },
]

const TITULO: Record<TipoAcaoIA, string> = {
  conteudos: "Revisar conteúdos",
  calendario: "Revisar compromissos",
  tarefas: "Revisar tarefas",
  estrategia: "Revisar estratégia",
  experimento: "Revisar experimento",
}

export function AcoesResposta({ texto, empresaId }: { texto: string; empresaId: string }) {
  const [tipoAtivo, setTipoAtivo] = useState<TipoAcaoIA | null>(null)
  const [carregando, setCarregando] = useState<TipoAcaoIA | null>(null)
  const [dados, setDados] = useState<any>(null)
  const [erro, setErro] = useState("")
  const [aplicando, setAplicando] = useState(false)
  const [sucesso, setSucesso] = useState("")

  async function abrir(tipo: TipoAcaoIA) {
    setCarregando(tipo)
    setErro("")
    setSucesso("")
    const r = await extrairAcaoIA(tipo, texto)
    setCarregando(null)
    if (!r.ok) {
      setTipoAtivo(tipo)
      setDados(null)
      setErro(r.erro ?? "Não foi possível preparar esta ação.")
      return
    }
    setTipoAtivo(tipo)
    setDados(r.dados)
  }

  async function confirmar() {
    if (!tipoAtivo || !dados) return
    setAplicando(true)
    const r = await aplicarAcaoIA(tipoAtivo, empresaId, dados)
    setAplicando(false)
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível salvar.")
      return
    }
    setSucesso(r.mensagem ?? "Salvo com sucesso.")
    setDados(null)
  }

  function fechar() {
    setTipoAtivo(null)
    setDados(null)
    setErro("")
    setSucesso("")
    setAplicando(false)
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ACOES.map(({ tipo, rotulo, Icone }) => (
          <button
            key={tipo}
            type="button"
            onClick={() => abrir(tipo)}
            disabled={carregando !== null}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
          >
            {carregando === tipo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icone className="h-3.5 w-3.5" />
            )}
            {rotulo}
          </button>
        ))}
      </div>

      <Dialog open={tipoAtivo !== null} onOpenChange={(aberto) => !aberto && fechar()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{tipoAtivo ? TITULO[tipoAtivo] : ""}</DialogTitle>
            <DialogDescription>
              Revise o que será salvo antes de confirmar. A IA extraiu isto da resposta.
            </DialogDescription>
          </DialogHeader>

          {erro && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {erro}
            </div>
          )}

          {sucesso ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {sucesso}
            </div>
          ) : (
            dados && tipoAtivo && <Previa tipo={tipoAtivo} dados={dados} />
          )}

          <DialogFooter>
            {sucesso ? (
              <Button onClick={fechar}>Fechar</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={fechar} disabled={aplicando}>
                  <X className="mr-1.5 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={confirmar} disabled={aplicando || !dados}>
                  {aplicando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                  Confirmar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Previa({ tipo, dados }: { tipo: TipoAcaoIA; dados: any }) {
  if (tipo === "conteudos") {
    return (
      <ul className="grid gap-2">
        {dados.conteudos?.map((c: any, i: number) => (
          <li key={i} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{c.titulo}</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{c.formato}</span>
            </div>
            {c.roteiro && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{c.roteiro}</p>}
          </li>
        ))}
      </ul>
    )
  }
  if (tipo === "calendario") {
    return (
      <ul className="grid gap-2">
        {dados.eventos?.map((e: any, i: number) => (
          <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
            <span className="text-sm text-foreground">{e.titulo}</span>
            <span className="text-xs text-muted-foreground">
              {e.tipo}
              {e.data ? ` · ${e.data}` : ""}
              {e.hora ? ` ${e.hora}` : ""}
            </span>
          </li>
        ))}
      </ul>
    )
  }
  if (tipo === "tarefas") {
    return (
      <ul className="grid gap-2">
        {dados.tarefas?.map((t: any, i: number) => (
          <li key={i} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{t.titulo}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {t.prioridade}
              </span>
            </div>
            {t.descricao && <p className="mt-1 text-xs text-muted-foreground">{t.descricao}</p>}
          </li>
        ))}
      </ul>
    )
  }
  if (tipo === "estrategia") {
    return (
      <div className="grid gap-3">
        {dados.estrategiaAtual?.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Estratégia</p>
            <ul className="grid gap-1">
              {dados.estrategiaAtual.map((s: string, i: number) => (
                <li key={i} className="rounded-lg border border-border p-2 text-sm text-foreground">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {dados.insights?.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Insights</p>
            <ul className="grid gap-1">
              {dados.insights.map((s: string, i: number) => (
                <li key={i} className="rounded-lg border border-border p-2 text-sm text-foreground">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }
  // experimento
  return (
    <div className="grid gap-2 text-sm">
      <Campo rotulo="Hipótese" valor={dados.hipotese} />
      <Campo rotulo="O que será testado" valor={dados.oQueFoiTestado} />
      {dados.resultado && <Campo rotulo="Resultado" valor={dados.resultado} />}
      {dados.conclusao && <Campo rotulo="Conclusão" valor={dados.conclusao} />}
      <Campo rotulo="Status" valor={dados.status} />
    </div>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-foreground">{valor}</p>
    </div>
  )
}
