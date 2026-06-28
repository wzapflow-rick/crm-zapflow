"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Sparkles, Loader2, Network, Lightbulb } from "lucide-react"
import { analisarPadroesAction, type EstadoPadroes } from "@/app/(crm)/clientes/padroes-actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Padrao, ConfiancaPadrao } from "@/lib/padroes-db"

const estadoInicial: EstadoPadroes = { ok: false }

const confiancaInfo: Record<ConfiancaPadrao, { label: string; classe: string }> = {
  alta: { label: "Alta confiança", classe: "bg-chart-4/15 text-chart-4" },
  media: { label: "Confiança média", classe: "bg-chart-3/15 text-chart-3" },
  baixa: { label: "Baixa confiança", classe: "bg-muted text-muted-foreground" },
}

function BotaoAnalisar({ temPadroes }: { temPadroes: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {pending ? "Analisando..." : temPadroes ? "Atualizar análise" : "Analisar padrões"}
    </Button>
  )
}

export function PadroesPanel({
  clienteId,
  padroes,
  ultimaAnalise,
}: {
  clienteId: string
  padroes: Padrao[]
  ultimaAnalise: string | null
}) {
  const [estado, formAction] = useActionState(analisarPadroesAction, estadoInicial)

  // Agrupa por categoria para visualização tipo "grafo de conhecimento".
  const grupos = padroes.reduce<Record<string, Padrao[]>>((acc, p) => {
    ;(acc[p.categoria] ??= []).push(p)
    return acc
  }, {})

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Network className="h-4 w-4 text-primary" />
          Padrões que a IA descobriu cruzando reuniões, performance, experimentos e evolução deste cliente.
        </div>
        <form action={formAction}>
          <input type="hidden" name="clienteId" value={clienteId} />
          <BotaoAnalisar temPadroes={padroes.length > 0} />
        </form>
      </div>

      {estado.erro && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{estado.erro}</p>
      )}
      {estado.ok && (
        <p className="mb-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          Análise concluída: {estado.quantidade} padrão(ões) identificado(s).
        </p>
      )}

      {padroes.length > 0 ? (
        <div className="space-y-6">
          {ultimaAnalise && (
            <p className="text-[11px] text-muted-foreground">
              Última análise em {new Date(ultimaAnalise).toLocaleString("pt-BR")}
            </p>
          )}
          {Object.entries(grupos).map(([categoria, itens]) => (
            <div key={categoria}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {categoria}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {itens.map((p) => {
                  const info = confiancaInfo[p.confianca]
                  return (
                    <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-pretty text-sm font-medium leading-relaxed text-foreground">{p.padrao}</p>
                      </div>
                      {p.evidencia && (
                        <p className="mt-2 pl-6 text-xs leading-relaxed text-muted-foreground">{p.evidencia}</p>
                      )}
                      <div className="mt-3 pl-6">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", info.classe)}>
                          {info.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Network className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">Nenhum padrão analisado ainda</p>
          <p className="mx-auto mt-1 max-w-md text-pretty text-sm text-muted-foreground">
            Quanto mais reuniões, performance e experimentos você registrar, mais ricos serão os padrões. Clique em
            &quot;Analisar padrões&quot; para a IA cruzar os dados deste cliente.
          </p>
        </div>
      )}
    </div>
  )
}
