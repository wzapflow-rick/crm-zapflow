"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, Check, ExternalLink, Camera as Instagram, Loader2, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  sugerirMetricasAction,
  listarPostsImportaveisAction,
  importarMidiaAction,
  type CandidatoMetrica,
} from "@/app/(crm)/clientes/instagram-metricas-actions"
import type { ConteudoParaMatch } from "@/lib/instagram-match"

function fmt(n: number | null): string {
  return n == null ? "—" : n.toLocaleString("pt-BR")
}

function dataCurta(iso: string): string {
  if (!iso) return "sem data"
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return "sem data"
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const CONFIANCA: Record<CandidatoMetrica["confianca"], { label: string; classe: string }> = {
  alta: { label: "Alta compatibilidade", classe: "bg-emerald-500/15 text-emerald-400" },
  media: { label: "Compatibilidade média", classe: "bg-amber-500/15 text-amber-400" },
  baixa: { label: "Baixa compatibilidade", classe: "bg-muted text-muted-foreground" },
}

function MetricasGrid({ m }: { m: CandidatoMetrica["metricas"] }) {
  const itens: [string, number | null][] = [
    ["Views", m.views],
    ["Alcance", m.alcance],
    ["Curtidas", m.curtidas],
    ["Comentários", m.comentarios],
    ["Salvamentos", m.salvamentos],
    ["Compart.", m.compartilhamentos],
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {itens.map(([label, valor]) => (
        <div key={label} className="rounded-lg border border-border bg-background/60 px-2.5 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground">{fmt(valor)}</p>
        </div>
      ))}
    </div>
  )
}

function PostCard({
  post,
  selecionado,
  onSelecionar,
  mostrarConfianca,
}: {
  post: CandidatoMetrica
  selecionado: boolean
  onSelecionar: () => void
  mostrarConfianca?: boolean
}) {
  const conf = CONFIANCA[post.confianca]
  return (
    <button
      type="button"
      onClick={onSelecionar}
      className={cn(
        "flex w-full gap-3 rounded-xl border p-3 text-left transition-colors",
        selecionado ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40",
      )}
    >
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnailUrl || "/placeholder.svg"}
          alt=""
          crossOrigin="anonymous"
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Instagram className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {dataCurta(post.publicadoEm)} · {post.formato}
          </span>
          {selecionado && <Check className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-foreground">{post.legenda || "(sem legenda)"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {mostrarConfianca && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", conf.classe)}>{conf.label}</span>
          )}
          {post.jaImportado && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Já vinculado
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Vincular um conteúdo do pipeline ao post real (casar automático + confirmar).
// ---------------------------------------------------------------------------
export function VincularInstagramDialog({
  clienteId,
  conteudo,
  trigger,
}: {
  clienteId: string
  conteudo: ConteudoParaMatch
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [temInstagram, setTemInstagram] = useState(true)
  const [candidatos, setCandidatos] = useState<CandidatoMetrica[]>([])
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, iniciarSalvar] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (!aberto) return
    setCarregando(true)
    setErro(null)
    sugerirMetricasAction(clienteId, conteudo)
      .then((res) => {
        setTemInstagram(res.temInstagram)
        setCandidatos(res.candidatos)
        setSelecionado(res.candidatos[0]?.mediaId ?? null)
      })
      .catch(() => setErro("Não foi possível buscar os posts do Instagram."))
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  function confirmar() {
    if (!selecionado) return
    setErro(null)
    iniciarSalvar(async () => {
      const res = await importarMidiaAction(clienteId, selecionado, {
        titulo: conteudo.titulo,
        formato: conteudo.formato,
        roteiro: conteudo.roteiro,
      })
      if (res.ok) {
        setAberto(false)
        router.refresh()
      } else {
        setErro(res.erro ?? "Não foi possível importar.")
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Puxar métricas do Instagram</DialogTitle>
          <DialogDescription>
            Encontramos o post mais provável para <span className="font-medium text-foreground">{conteudo.titulo}</span>.
            Confirme se é este — as métricas entram automaticamente e a IA gera os aprendizados.
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analisando posts...
          </div>
        ) : !temInstagram ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            <Instagram className="mx-auto mb-2 h-6 w-6" />
            Nenhum post sincronizado. Conecte e sincronize o Instagram na aba correspondente para puxar as métricas.
          </div>
        ) : candidatos.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum post compatível encontrado.
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              {candidatos.map((post, i) => (
                <PostCard
                  key={post.mediaId}
                  post={post}
                  selecionado={selecionado === post.mediaId}
                  onSelecionar={() => setSelecionado(post.mediaId)}
                  mostrarConfianca={i === 0 || post.confianca !== "baixa"}
                />
              ))}
            </div>

            {selecionado && (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Métricas que serão importadas</p>
                <MetricasGrid m={candidatos.find((c) => c.mediaId === selecionado)!.metricas} />
              </div>
            )}

            {erro && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}

            <div className="flex items-center justify-between gap-2">
              {candidatos[0]?.permalink ? (
                <a
                  href={candidatos.find((c) => c.mediaId === selecionado)?.permalink || candidatos[0].permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver no Instagram
                </a>
              ) : (
                <span />
              )}
              <Button onClick={confirmar} disabled={!selecionado || salvando} className="gap-1.5">
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {salvando ? "Importando..." : "Confirmar e importar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Importar um post avulso do Instagram (aba Performance).
// ---------------------------------------------------------------------------
export function ImportarInstagramDialog({ clienteId, trigger }: { clienteId: string; trigger: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [temInstagram, setTemInstagram] = useState(true)
  const [posts, setPosts] = useState<CandidatoMetrica[]>([])
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, iniciarSalvar] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (!aberto) return
    setCarregando(true)
    setErro(null)
    listarPostsImportaveisAction(clienteId)
      .then((res) => {
        setTemInstagram(res.temInstagram)
        setPosts(res.posts)
        setSelecionado(res.posts.find((p) => !p.jaImportado)?.mediaId ?? null)
      })
      .catch(() => setErro("Não foi possível carregar os posts do Instagram."))
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  function confirmar() {
    if (!selecionado) return
    setErro(null)
    iniciarSalvar(async () => {
      const res = await importarMidiaAction(clienteId, selecionado, {})
      if (res.ok) {
        setAberto(false)
        router.refresh()
      } else {
        setErro(res.erro ?? "Não foi possível importar.")
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar post do Instagram</DialogTitle>
          <DialogDescription>
            Escolha um post publicado. As métricas reais entram automaticamente e a IA gera os aprendizados para as
            próximas estratégias.
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando posts...
          </div>
        ) : !temInstagram ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            <Instagram className="mx-auto mb-2 h-6 w-6" />
            Nenhum post sincronizado. Conecte e sincronize o Instagram na aba correspondente.
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid max-h-[46vh] gap-2 overflow-y-auto pr-1">
              {posts.map((post) => (
                <PostCard
                  key={post.mediaId}
                  post={post}
                  selecionado={selecionado === post.mediaId}
                  onSelecionar={() => setSelecionado(post.mediaId)}
                />
              ))}
            </div>

            {selecionado && (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Métricas que serão importadas</p>
                <MetricasGrid m={posts.find((c) => c.mediaId === selecionado)!.metricas} />
              </div>
            )}

            {erro && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}

            <div className="flex justify-end">
              <Button onClick={confirmar} disabled={!selecionado || salvando} className="gap-1.5">
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                {salvando ? "Importando..." : "Importar e analisar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
