"use client"

import { useState } from "react"
import { Check, Copy, DollarSign, FileText, MessageSquare, ShieldQuestion, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { comercialSecoes, type ComercialItem, type ComercialSecao } from "@/lib/comercial-data"

const ICONES: Record<ComercialSecao["icone"], LucideIcon> = {
  MessageSquare,
  ShieldQuestion,
  FileText,
  DollarSign,
}

export function ComercialView() {
  const [secaoAtiva, setSecaoAtiva] = useState(comercialSecoes[0].id)
  const secao = comercialSecoes.find((s) => s.id === secaoAtiva) ?? comercialSecoes[0]

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">Playbook de vendas</p>
          <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground text-balance md:text-5xl">
            Comercial <span className="text-primary">SIMPLE</span>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Scripts de abordagem, quebra de objeções, modelos de proposta e precificação. Tudo pronto para copiar e usar
            no atendimento do dia a dia.
          </p>
        </header>

        {/* Navegação por seções */}
        <div className="mt-8 flex flex-wrap gap-2">
          {comercialSecoes.map((s) => {
            const Icone = ICONES[s.icone]
            const ativo = s.id === secaoAtiva
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSecaoAtiva(s.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  ativo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <Icone className="h-4 w-4" />
                {s.titulo}
              </button>
            )
          })}
        </div>

        {/* Conteúdo da seção ativa */}
        <section className="mt-8">
          <p className="text-sm text-muted-foreground">{secao.descricao}</p>
          <div className="mt-4 grid gap-3">
            {secao.itens.map((item, i) => (
              <ItemCard key={`${secao.id}-${i}`} item={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function ItemCard({ item }: { item: ComercialItem }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(item.conteudo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      // Ambientes sem permissão de clipboard: ignora silenciosamente.
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground text-pretty">{item.titulo}</h3>
          {item.tags && item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={copiar}
          aria-label={`Copiar: ${item.titulo}`}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            copiado
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.conteudo}</p>
    </div>
  )
}
