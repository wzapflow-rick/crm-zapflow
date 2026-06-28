"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, Globe, Lightbulb, ShieldCheck } from "lucide-react"
import { analisarInteligenciaGlobalAction, type EstadoGlobal } from "@/app/(crm)/marketing/global-actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AprendizadoGlobal, ConfiancaGlobal } from "@/lib/global-db"

const confiancaInfo: Record<ConfiancaGlobal, { label: string; classe: string }> = {
  alta: { label: "Alta confiança", classe: "bg-chart-4/15 text-chart-4" },
  media: { label: "Confiança média", classe: "bg-chart-3/15 text-chart-3" },
  baixa: { label: "Baixa confiança", classe: "bg-muted text-muted-foreground" },
}

export function InteligenciaGlobal({
  aprendizados,
  ultimaAnalise,
}: {
  aprendizados: AprendizadoGlobal[]
  ultimaAnalise: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [estado, setEstado] = useState<EstadoGlobal | null>(null)

  function analisar() {
    startTransition(async () => {
      const r = await analisarInteligenciaGlobalAction()
      setEstado(r)
      if (r.ok) router.refresh()
    })
  }

  // Agrupa por categoria.
  const grupos = aprendizados.reduce<Record<string, AprendizadoGlobal[]>>((acc, a) => {
    ;(acc[a.categoria] ??= []).push(a)
    return acc
  }, {})

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Aprendizados de toda a carteira</p>
            <p className="text-pretty text-sm text-muted-foreground">
              A IA cruza dados <strong>anônimos e agregados</strong> de todos os clientes para achar o que funciona em
              geral. Nenhum dado identificável de cliente é exposto.
            </p>
          </div>
        </div>
        <Button onClick={analisar} disabled={pending} size="sm" className="gap-1.5">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {pending ? "Analisando base..." : aprendizados.length > 0 ? "Atualizar análise" : "Analisar base"}
        </Button>
      </div>

      {estado?.erro && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{estado.erro}</p>
      )}
      {estado?.ok && (
        <p className="mb-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          Análise concluída: {estado.quantidade} aprendizado(s) gerado(s).
        </p>
      )}

      {aprendizados.length > 0 ? (
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
                {itens.map((a) => {
                  const info = confiancaInfo[a.confianca]
                  return (
                    <div key={a.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-pretty text-sm font-medium leading-relaxed text-foreground">
                          {a.aprendizado}
                        </p>
                      </div>
                      {a.baseAmostral && (
                        <p className="mt-2 pl-6 text-xs leading-relaxed text-muted-foreground">
                          Base: {a.baseAmostral}
                        </p>
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
          <Globe className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">Nenhum aprendizado global ainda</p>
          <p className="mx-auto mt-1 max-w-md text-pretty text-sm text-muted-foreground">
            Quanto mais clientes tiverem performance, experimentos e padrões registrados, mais confiável fica a
            inteligência da agência. Clique em &quot;Analisar base&quot; para a IA cruzar tudo.
          </p>
        </div>
      )}
    </div>
  )
}
