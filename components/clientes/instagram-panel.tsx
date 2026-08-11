"use client"

import { useState, useTransition } from "react"
import {
  Instagram,
  Loader2,
  RefreshCw,
  Unplug,
  ExternalLink,
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  Send,
  BarChart3,
  AlertTriangle,
  FlaskConical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ConexaoInstagram, MidiaInstagram } from "@/lib/instagram-db"
import {
  conectarDemoAction,
  desconectarInstagramAction,
  sincronizarInstagramAction,
} from "@/app/(crm)/clientes/instagram-actions"

const nf = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR"))

const tipoLabel: Record<string, string> = {
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
  CAROUSEL_ALBUM: "Carrossel",
  REELS: "Reels",
}

const ERROS: Record<string, string> = {
  nao_configurado:
    "A conexão real ainda não está configurada. Adicione as credenciais do app da Meta (veja abaixo) para habilitar.",
  autorizacao_negada: "Autorização cancelada no Instagram.",
  state_invalido: "Sessão de conexão inválida. Tente novamente.",
  sem_codigo: "O Instagram não retornou o código de autorização.",
  falha_token: "Não foi possível concluir a conexão com o Instagram.",
}

export function InstagramPanel({
  clienteId,
  clienteNome,
  conexao,
  midias,
  configurado,
  avisoUrl,
}: {
  clienteId: string
  clienteNome: string
  conexao: ConexaoInstagram | null
  midias: MidiaInstagram[]
  configurado: boolean
  avisoUrl?: { erro?: string; ok?: boolean }
}) {
  const [pending, startTransition] = useTransition()
  const [acao, setAcao] = useState<"demo" | "sync" | "desconectar" | null>(null)
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)

  function rodar(tipo: "demo" | "sync" | "desconectar") {
    setAcao(tipo)
    setMsg(null)
    startTransition(async () => {
      const fn =
        tipo === "demo"
          ? conectarDemoAction
          : tipo === "sync"
            ? sincronizarInstagramAction
            : desconectarInstagramAction
      const r = await fn(clienteId)
      setMsg({ tipo: r.ok ? "ok" : "erro", texto: r.ok ? r.mensagem ?? "Pronto." : r.erro ?? "Erro." })
      setAcao(null)
    })
  }

  const carregando = (t: typeof acao) => pending && acao === t

  // ── Estado: não conectado ──────────────────────────────────────────────
  if (!conexao) {
    return (
      <div>
        <AvisoUrl avisoUrl={avisoUrl} />
        {msg && <Mensagem msg={msg} />}

        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Instagram className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">Conectar Instagram</h3>
          <p className="mx-auto mt-1.5 max-w-md text-pretty text-sm text-muted-foreground">
            Vincule a conta profissional do Instagram de {clienteNome} para trazer seguidores, alcance e o
            desempenho de cada publicação direto para o CRM — alimentando também a análise da IA.
          </p>

          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button asChild disabled={!configurado} className={cn(!configurado && "pointer-events-none opacity-50")}>
              <a href={`/api/instagram/connect?empresa=${clienteId}`}>
                <Instagram className="h-4 w-4" />
                Conectar conta real
              </a>
            </Button>
            <Button variant="outline" onClick={() => rodar("demo")} disabled={pending}>
              {carregando("demo") ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              Ativar demonstração
            </Button>
          </div>

          {!configurado && (
            <div className="mx-auto mt-5 max-w-md rounded-lg border border-border bg-muted/40 p-3 text-left">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-chart-3" />
                Conexão real ainda não configurada
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Para conectar contas de verdade, crie um app no Meta for Developers e adicione as variáveis{" "}
                <code className="rounded bg-background px-1">INSTAGRAM_APP_ID</code>,{" "}
                <code className="rounded bg-background px-1">INSTAGRAM_APP_SECRET</code> e{" "}
                <code className="rounded bg-background px-1">INSTAGRAM_TOKEN_SECRET</code>. Enquanto isso, use a
                demonstração para explorar a interface.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Estado: conectado ───────────────────────────────────────────────────
  const totalAlcance = midias.reduce((s, m) => s + (m.alcance ?? 0), 0)
  const totalInteracoes = midias.reduce(
    (s, m) => s + (m.curtidas ?? 0) + (m.comentarios ?? 0) + (m.salvamentos ?? 0) + (m.compartilhamentos ?? 0),
    0,
  )

  return (
    <div>
      <AvisoUrl avisoUrl={avisoUrl} />
      {msg && <Mensagem msg={msg} />}

      {/* Cabeçalho da conta */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10">
              {conexao.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={conexao.profilePictureUrl || "/placeholder.svg"} alt={conexao.username ?? ""} className="h-full w-full object-cover" />
              ) : (
                <Instagram className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">@{conexao.username ?? "conta"}</p>
                {conexao.modo === "demo" ? (
                  <span className="rounded-full bg-chart-3/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-chart-3">
                    Demonstração
                  </span>
                ) : (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                    Conectado
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {conexao.accountType ? `${conexao.accountType} · ` : ""}
                {conexao.ultimaSync
                  ? `sincronizado ${new Date(conexao.ultimaSync).toLocaleString("pt-BR")}`
                  : "ainda não sincronizado"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => rodar("sync")} disabled={pending} className="gap-1.5">
              {carregando("sync") ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sincronizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => rodar("desconectar")}
              disabled={pending}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              {carregando("desconectar") ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unplug className="h-3.5 w-3.5" />
              )}
              Desconectar
            </Button>
          </div>
        </div>

        {/* Métricas da conta */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metrica rotulo="Seguidores" valor={nf(conexao.seguidores)} />
          <Metrica rotulo="Publicações" valor={nf(conexao.midiaCount ?? midias.length)} />
          <Metrica rotulo="Alcance (posts sync.)" valor={nf(totalAlcance)} />
          <Metrica rotulo="Interações (posts sync.)" valor={nf(totalInteracoes)} />
        </div>

        {conexao.status === "erro" && conexao.ultimoErro && (
          <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {conexao.ultimoErro}
          </p>
        )}
      </div>

      {/* Grade de publicações */}
      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Publicações sincronizadas</h3>
          <span className="text-xs text-muted-foreground">({midias.length})</span>
        </div>

        {midias.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {midias.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                    {tipoLabel[m.tipo] ?? m.tipo}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {m.publicadoEm ? new Date(m.publicadoEm).toLocaleDateString("pt-BR") : "—"}
                  </span>
                </div>
                {m.legenda && (
                  <p className="mt-2 line-clamp-2 text-pretty text-sm text-foreground">{m.legenda}</p>
                )}
                <div className="mt-3 grid grid-cols-3 gap-y-2 gap-x-3 text-xs text-muted-foreground">
                  <Stat icon={Eye} valor={nf(m.visualizacoes ?? m.alcance)} titulo="Views/Alcance" />
                  <Stat icon={Heart} valor={nf(m.curtidas)} titulo="Curtidas" />
                  <Stat icon={MessageCircle} valor={nf(m.comentarios)} titulo="Comentários" />
                  <Stat icon={Bookmark} valor={nf(m.salvamentos)} titulo="Salvamentos" />
                  <Stat icon={Send} valor={nf(m.compartilhamentos)} titulo="Compart." />
                  {m.permalink && (
                    <a
                      href={m.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="col-span-1 inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma publicação sincronizada ainda. Clique em Sincronizar para buscar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <p className="text-lg font-semibold text-foreground">{valor}</p>
      <p className="text-[11px] text-muted-foreground">{rotulo}</p>
    </div>
  )
}

function Stat({ icon: Icon, valor, titulo }: { icon: typeof Heart; valor: string; titulo: string }) {
  return (
    <span className="flex items-center gap-1" title={titulo}>
      <Icon className="h-3.5 w-3.5" />
      {valor}
    </span>
  )
}

function Mensagem({ msg }: { msg: { tipo: "ok" | "erro"; texto: string } }) {
  return (
    <p
      className={cn(
        "mb-4 rounded-lg px-3 py-2 text-sm",
        msg.tipo === "ok" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
      )}
    >
      {msg.texto}
    </p>
  )
}

function AvisoUrl({ avisoUrl }: { avisoUrl?: { erro?: string; ok?: boolean } }) {
  if (!avisoUrl) return null
  if (avisoUrl.ok) {
    return (
      <p className="mb-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
        Instagram conectado com sucesso.
      </p>
    )
  }
  if (avisoUrl.erro) {
    return (
      <p className="mb-4 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {ERROS[avisoUrl.erro] ?? "Não foi possível conectar o Instagram."}
      </p>
    )
  }
  return null
}
