"use client"

import { useMemo, useState } from "react"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lightbulb,
  Rocket,
  Scissors,
  Search,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { wikiCategorias, type WikiArtigo, type WikiBloco, type WikiCategoria } from "@/lib/wiki-data"

const ICONES: Record<WikiCategoria["icone"], LucideIcon> = {
  Rocket,
  Video,
  Scissors,
  CheckCircle2,
  Users,
  BookOpen,
}

type ArtigoSelecionado = { categoria: WikiCategoria; artigo: WikiArtigo }

export function WikiView() {
  const [busca, setBusca] = useState("")
  const [aberto, setAberto] = useState<ArtigoSelecionado | null>(null)

  // Filtra categorias/artigos pelo termo de busca (título e resumo).
  const categoriasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return wikiCategorias
    return wikiCategorias
      .map((c) => ({
        ...c,
        artigos: c.artigos.filter(
          (a) =>
            a.titulo.toLowerCase().includes(termo) ||
            a.resumo.toLowerCase().includes(termo) ||
            c.titulo.toLowerCase().includes(termo),
        ),
      }))
      .filter((c) => c.artigos.length > 0)
  }, [busca])

  const totalArtigos = useMemo(() => wikiCategorias.reduce((s, c) => s + c.artigos.length, 0), [])

  if (aberto) {
    return <Leitor selecao={aberto} onVoltar={() => setAberto(null)} />
  }

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">Manual interno</p>
          <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-foreground text-balance md:text-5xl">
            Wiki da <span className="text-primary">SIMPLE</span>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Tudo que a equipe precisa saber para trabalhar no padrão SIMPLE: onboarding, gravação, edição, aprovação e
            cultura. {totalArtigos} artigos organizados por tema.
          </p>
        </header>

        {/* Busca */}
        <div className="relative mt-8">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar na wiki..."
            className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Categorias e artigos */}
        <div className="mt-8 space-y-8">
          {categoriasFiltradas.map((c) => {
            const Icone = ICONES[c.icone]
            return (
              <section key={c.id}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-medium text-foreground">{c.titulo}</h2>
                    <p className="truncate text-sm text-muted-foreground">{c.descricao}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {c.artigos.map((a) => (
                    <button
                      key={a.slug}
                      type="button"
                      onClick={() => setAberto({ categoria: c, artigo: a })}
                      className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground">{a.titulo}</h3>
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">{a.resumo}</p>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {a.tempo}
                        </span>
                      </div>
                      <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              </section>
            )
          })}

          {categoriasFiltradas.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum artigo encontrado para “{busca}”. Tente outro termo.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function Leitor({ selecao, onVoltar }: { selecao: ArtigoSelecionado; onVoltar: () => void }) {
  const { categoria, artigo } = selecao

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <button
          type="button"
          onClick={onVoltar}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a wiki
        </button>

        <header className="mt-6">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">{categoria.titulo}</p>
          <h1 className="mt-2 font-serif text-3xl font-light tracking-tight text-foreground text-balance md:text-4xl">
            {artigo.titulo}
          </h1>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {artigo.tempo} de leitura
          </span>
        </header>

        <article className="mt-8 space-y-5">
          {artigo.blocos.map((bloco, i) => (
            <Bloco key={i} bloco={bloco} />
          ))}
        </article>
      </div>
    </main>
  )
}

function Bloco({ bloco }: { bloco: WikiBloco }) {
  switch (bloco.tipo) {
    case "paragrafo":
      return <p className="leading-relaxed text-foreground">{bloco.texto}</p>
    case "subtitulo":
      return <h2 className="pt-2 font-serif text-xl font-light text-foreground">{bloco.texto}</h2>
    case "lista":
      return (
        <ul className="space-y-2">
          {bloco.itens.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )
    case "passos":
      return (
        <ol className="space-y-3">
          {bloco.itens.map((item, i) => (
            <li key={item} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed text-foreground">{item}</span>
            </li>
          ))}
        </ol>
      )
    case "dica":
      return (
        <div className="flex gap-3 rounded-xl border border-primary/20 bg-accent p-4">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
          <div>
            <h3 className="text-sm font-semibold text-accent-foreground">Dica</h3>
            <p className="mt-1 text-sm leading-relaxed text-accent-foreground/80">{bloco.texto}</p>
          </div>
        </div>
      )
    default:
      return null
  }
}
