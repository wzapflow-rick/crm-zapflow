"use client"

import { useMemo, useState } from "react"
import {
  Phone,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  UserPlus,
  Filter,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  conversas as conversasIniciais,
  membros,
  membroPorId,
  type Conversa,
  type StatusConversa,
} from "@/lib/zapflow-data"
import { useApp } from "@/components/crm/providers"

const statusLabel: Record<StatusConversa, string> = {
  aberta: "Aberta",
  pendente: "Pendente",
  resolvida: "Resolvida",
}

const statusCor: Record<StatusConversa, string> = {
  aberta: "bg-primary/10 text-primary",
  pendente: "bg-chart-3/15 text-chart-3",
  resolvida: "bg-muted text-muted-foreground",
}

type Filtro = "todas" | "minhas" | "nao_atribuidas"

export function Inbox() {
  const { usuario } = useApp()
  const [lista, setLista] = useState<Conversa[]>(conversasIniciais)
  const [selecionadaId, setSelecionadaId] = useState<string>(conversasIniciais[0].id)
  const [rascunho, setRascunho] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("todas")

  const conversasFiltradas = useMemo(() => {
    if (filtro === "minhas")
      return lista.filter((c) => c.responsavelId === usuario.id)
    if (filtro === "nao_atribuidas")
      return lista.filter((c) => c.responsavelId === null)
    return lista
  }, [lista, filtro, usuario.id])

  const selecionada = lista.find((c) => c.id === selecionadaId) ?? lista[0]

  function enviar() {
    if (!rascunho.trim()) return
    setLista((prev) =>
      prev.map((c) =>
        c.id === selecionada.id
          ? {
              ...c,
              ultimaMensagem: rascunho,
              ultimaHora: "agora",
              mensagens: [
                ...c.mensagens,
                {
                  id: `m${c.mensagens.length + 1}`,
                  conteudo: rascunho,
                  hora: "agora",
                  deMim: true,
                  autor: usuario.nome,
                },
              ],
            }
          : c,
      ),
    )
    setRascunho("")
  }

  function atribuir(membroId: string) {
    setLista((prev) =>
      prev.map((c) =>
        c.id === selecionada.id
          ? { ...c, responsavelId: membroId === "none" ? null : membroId }
          : c,
      ),
    )
  }

  function mudarStatus(status: StatusConversa) {
    setLista((prev) =>
      prev.map((c) => (c.id === selecionada.id ? { ...c, status } : c)),
    )
  }

  const responsavel = membroPorId(selecionada.responsavelId)

  return (
    <div className="flex min-h-0 flex-1">
      {/* Lista de conversas */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
            <SelectTrigger className="h-8 flex-1 text-sm">
              <span>
                {filtro === "minhas"
                  ? "Atribuídas a mim"
                  : filtro === "nao_atribuidas"
                    ? "Não atribuídas"
                    : "Todas as conversas"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as conversas</SelectItem>
              <SelectItem value="minhas">Atribuídas a mim</SelectItem>
              <SelectItem value="nao_atribuidas">Não atribuídas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="flex-1">
          {conversasFiltradas.map((c) => {
            const resp = membroPorId(c.responsavelId)
            return (
              <button
                key={c.id}
                onClick={() => setSelecionadaId(c.id)}
                className={cn(
                  "flex w-full gap-3 border-b border-border/60 p-3 text-left transition-colors hover:bg-accent/50",
                  c.id === selecionada.id && "bg-accent",
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className={cn(c.cor, "text-xs text-white")}>
                    {c.iniciais}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {c.contatoNome}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {c.ultimaHora}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.ultimaMensagem}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        statusCor[c.status],
                      )}
                    >
                      {statusLabel[c.status]}
                    </span>
                    {resp ? (
                      <span className="text-[10px] text-muted-foreground">
                        {resp.iniciais}
                      </span>
                    ) : (
                      <span className="text-[10px] text-chart-4">
                        sem responsável
                      </span>
                    )}
                  </div>
                </div>
                {c.naoLidas > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center self-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                    {c.naoLidas}
                  </span>
                )}
              </button>
            )
          })}
          {conversasFiltradas.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma conversa neste filtro.
            </p>
          )}
        </ScrollArea>
      </div>

      {/* Thread */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className={cn(selecionada.cor, "text-xs text-white")}>
                {selecionada.iniciais}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {selecionada.contatoNome}
              </p>
              <p className="text-xs text-muted-foreground">
                {selecionada.contatoTelefone}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Phone className="h-4 w-4" />
            Ligar
          </Button>
        </div>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {selecionada.mensagens.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col",
                  m.deMim ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                    m.deMim
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-card text-card-foreground border border-border",
                  )}
                >
                  {m.conteudo}
                </div>
                <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                  {m.deMim && m.autor && <span>{m.autor} ·</span>}
                  <span>{m.hora}</span>
                  {m.deMim && <CheckCheck className="h-3 w-3 text-primary" />}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card p-3">
          <div className="flex items-end gap-2">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  enviar()
                }
              }}
              placeholder="Escreva uma mensagem..."
              className="h-10 flex-1"
            />
            <Button onClick={enviar} size="icon" className="h-10 w-10 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            Enviado pela conta de WhatsApp da empresa via Evolution API ·
            assinado por {usuario.nome}
          </p>
        </div>
      </div>

      {/* Painel de contexto */}
      <div className="hidden w-72 shrink-0 flex-col gap-4 border-l border-border bg-card p-4 lg:flex">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Responsável
          </p>
          <Select
            value={selecionada.responsavelId ?? "none"}
            onValueChange={atribuir}
          >
            <SelectTrigger className="h-9 text-sm">
              <span>{responsavel ? responsavel.nome : "Não atribuída"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não atribuída</SelectItem>
              {membros.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {responsavel && (
            <div className="mt-2 flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  className={cn(responsavel.cor, "text-[10px] text-white")}
                >
                  {responsavel.iniciais}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                Atendendo agora
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(["aberta", "pendente", "resolvida"] as StatusConversa[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => mudarStatus(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    selecionada.status === s
                      ? statusCor[s]
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {statusLabel[s]}
                </button>
              ),
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selecionada.tags.map((t) => (
              <Badge key={t} variant="secondary" className="font-normal">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
            <UserPlus className="h-4 w-4" />
            Ver ficha do contato
          </Button>
        </div>
      </div>
    </div>
  )
}
