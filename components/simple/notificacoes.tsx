"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Bell, MessageSquare, AlertTriangle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type NotificacaoMensagem = {
  id: string
  clienteId: string
  clienteNome: string
  iniciais: string
  cor: string
  autorNome: string
  texto: string
  data: string
  createdAt: string
}

type TarefaAtrasada = {
  id: string
  titulo: string
  clienteNome: string
  responsavelNome: string
  prazo: string
  prazoLabel: string
  diasAtraso: number
  prioridade: string
}

type RespostaNotificacoes = {
  mensagens: NotificacaoMensagem[]
  tarefasAtrasadas: TarefaAtrasada[]
}

const LS_KEY = "crm:notificacoes:lidasAte"

async function buscar(url: string): Promise<RespostaNotificacoes> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao buscar notificações")
  const json = (await res.json()) as Partial<RespostaNotificacoes>
  return {
    mensagens: json.mensagens ?? [],
    tarefasAtrasadas: json.tarefasAtrasadas ?? [],
  }
}

// Toca um bip curto usando a Web Audio API (sem precisar de arquivo de áudio).
function tocarBip() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1180, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.start()
    osc.stop(ctx.currentTime + 0.36)
    osc.onended = () => ctx.close()
  } catch {
    // silêncio caso o navegador bloqueie o áudio
  }
}

export function Notificacoes() {
  const { data } = useSWR("/api/notificacoes", buscar, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })
  const mensagens = data?.mensagens ?? []
  const tarefasAtrasadas = data?.tarefasAtrasadas ?? []

  const [aberto, setAberto] = useState(false)
  const [lidasAte, setLidasAte] = useState<string>("")
  const containerRef = useRef<HTMLDivElement>(null)
  // Guarda o id da mensagem mais recente já vista, para detectar chegada de novas.
  const ultimoTopoRef = useRef<string | null>(null)

  // Inicializa o "lido até" com o valor salvo neste navegador.
  useEffect(() => {
    setLidasAte(localStorage.getItem(LS_KEY) ?? "")
  }, [])

  // Detecta mensagens novas para tocar o som (ignora o primeiro carregamento).
  useEffect(() => {
    const topo = mensagens[0]
    if (!topo) return
    if (ultimoTopoRef.current === null) {
      // primeira carga: apenas memoriza, sem tocar
      ultimoTopoRef.current = topo.id
      return
    }
    if (topo.id !== ultimoTopoRef.current) {
      ultimoTopoRef.current = topo.id
      // só toca se for realmente nova (ainda não lida)
      if (!lidasAte || topo.createdAt > lidasAte) tocarBip()
    }
  }, [mensagens, lidasAte])

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [aberto])

  const naoLidas = useMemo(
    () => mensagens.filter((m) => !lidasAte || m.createdAt > lidasAte),
    [mensagens, lidasAte],
  )

  // O badge soma mensagens novas + tarefas atrasadas (alerta persistente).
  const totalBadge = naoLidas.length + tarefasAtrasadas.length

  function abrir() {
    const proximo = !aberto
    setAberto(proximo)
    // ao abrir, marca tudo como lido a partir da mensagem mais recente
    if (proximo && mensagens[0]) {
      const marca = mensagens[0].createdAt
      setLidasAte(marca)
      localStorage.setItem(LS_KEY, marca)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={abrir}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={
          totalBadge > 0
            ? `${totalBadge} notificações (${tarefasAtrasadas.length} tarefas atrasadas)`
            : "Notificações"
        }
      >
        <Bell className="h-5 w-5" />
        {totalBadge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          <ScrollArea className="max-h-[26rem]">
            {/* Seção: tarefas atrasadas */}
            {tarefasAtrasadas.length > 0 && (
              <div>
                <div className="flex items-center justify-between border-b border-border bg-destructive/5 px-4 py-3">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Tarefas atrasadas
                  </span>
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    {tarefasAtrasadas.length}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {tarefasAtrasadas.map((t) => (
                    <li key={t.id}>
                      <Link
                        href="/tarefas"
                        onClick={() => setAberto(false)}
                        className="flex gap-3 px-4 py-3 transition-colors hover:bg-accent"
                      >
                        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-foreground">{t.titulo}</span>
                            <span className="shrink-0 text-[10px] font-medium text-destructive">
                              {t.diasAtraso === 1 ? "1 dia" : `${t.diasAtraso} dias`}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {[t.responsavelNome, t.clienteNome].filter(Boolean).join(" · ") || "Sem responsável"}
                            {t.prazoLabel ? ` · venceu ${t.prazoLabel}` : ""}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Seção: mensagens dos clientes */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-popover-foreground">Mensagens dos clientes</span>
              {naoLidas.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {naoLidas.length} nova{naoLidas.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {mensagens.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Nenhuma mensagem por enquanto.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {mensagens.map((m) => {
                  const nova = !lidasAte || m.createdAt > lidasAte
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/clientes/${m.clienteId}?aba=comunicacao`}
                        onClick={() => setAberto(false)}
                        className={cn(
                          "flex gap-3 px-4 py-3 transition-colors hover:bg-accent",
                          nova && "bg-primary/5",
                        )}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={cn(m.cor, "text-[10px] text-primary-foreground")}>
                            {m.iniciais}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-foreground">{m.clienteNome}</span>
                            {m.data && <span className="shrink-0 text-[10px] text-muted-foreground">{m.data}</span>}
                          </div>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{m.texto}</p>
                        </div>
                        {nova && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
