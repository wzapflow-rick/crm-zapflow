"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Brain, Loader2, SendHorizontal, Sparkles, Trash2, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { carregarChatClienteAction, limparChatAction } from "@/app/(crm)/marketing/chat-actions"
import type { ResumoContexto } from "@/lib/contexto-cliente"

export type ClienteOpcao = {
  id: string
  nome: string
  segmento: string
  status: string
  iniciais: string
  cor: string
  logoUrl: string
}

const SUGESTOES = [
  "Faça um diagnóstico estratégico completo deste cliente.",
  "Quais são as 3 maiores oportunidades escondidas agora?",
  "Crie 5 ideias de conteúdo com ganchos fortes para o próximo mês.",
  "O que devemos parar de fazer e o que dobrar a aposta?",
]

export function ChatEstrategico({ clientes }: { clientes: ClienteOpcao[] }) {
  const [clienteId, setClienteId] = useState<string>("")
  const [resumo, setResumo] = useState<ResumoContexto | null>(null)
  const [carregandoCtx, setCarregandoCtx] = useState(false)
  const [input, setInput] = useState("")
  const clienteIdRef = useRef(clienteId)
  clienteIdRef.current = clienteId

  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/marketing/chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, empresaId: clienteIdRef.current },
      }),
    }),
  })

  const clienteAtual = clientes.find((c) => c.id === clienteId)
  const ocupado = status === "submitted" || status === "streaming"

  // Ao trocar de cliente: carrega resumo de contexto + histórico salvo do chat.
  useEffect(() => {
    if (!clienteId) {
      setResumo(null)
      setMessages([])
      return
    }
    let ativo = true
    setCarregandoCtx(true)
    carregarChatClienteAction(clienteId).then((dados) => {
      if (!ativo) return
      setResumo(dados.resumo)
      setMessages(
        dados.mensagens.map(
          (m): UIMessage => ({
            id: m.id,
            role: m.papel,
            parts: [{ type: "text", text: m.texto }],
          }),
        ),
      )
      setCarregandoCtx(false)
    })
    return () => {
      ativo = false
    }
  }, [clienteId, setMessages])

  function enviar(texto: string) {
    const limpo = texto.trim()
    if (!limpo || !clienteId || ocupado) return
    sendMessage({ text: limpo })
    setInput("")
  }

  async function limpar() {
    if (!clienteId) return
    await limparChatAction(clienteId)
    setMessages([])
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr_300px]">
      {/* Coluna 1: seletor de cliente */}
      <aside className="lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">
        <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Clientes</p>
        {clientes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </p>
        ) : (
          <ul className="grid gap-1">
            {clientes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setClienteId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
                    clienteId === c.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-border hover:bg-muted",
                  )}
                >
                  <Avatar cliente={c} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{c.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.segmento}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Coluna 2: conversa */}
      <section className="flex min-h-[calc(100vh-13rem)] flex-col rounded-2xl border border-border bg-card">
        {!clienteId ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Brain className="h-6 w-6" />
            </span>
            <p className="font-medium text-foreground">Selecione um cliente</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              A SIMPLE OS carrega toda a memória do cliente e responde como se acompanhasse a conta desde o primeiro
              dia.
            </p>
          </div>
        ) : (
          <>
            {/* Cabeçalho da conversa */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {clienteAtual && <Avatar cliente={clienteAtual} />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{clienteAtual?.nome}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    SIMPLE OS · com memória do cliente
                  </p>
                </div>
              </div>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={limpar} className="shrink-0 text-muted-foreground">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Mensagens */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && !carregandoCtx && (
                <div className="grid gap-2">
                  <p className="text-sm text-muted-foreground">Comece com uma pergunta estratégica:</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUGESTOES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => enviar(s)}
                        className="rounded-xl border border-border bg-background p-3 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/5"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <Bolha key={m.id} papel={m.role}>
                  {textoDe(m)}
                </Bolha>
              ))}

              {status === "submitted" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  SIMPLE OS está pensando...
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  Ocorreu um erro ao gerar a resposta. Verifique a chave da OpenAI e tente novamente.
                </div>
              )}
            </div>

            {/* Campo de envio */}
            <div className="border-t border-border p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  enviar(input)
                }}
                className="flex items-end gap-2"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      enviar(input)
                    }
                  }}
                  rows={1}
                  placeholder="Pergunte algo sobre este cliente..."
                  className="max-h-32 min-h-[42px] resize-none"
                />
                <Button type="submit" size="icon" disabled={ocupado || !input.trim()} className="h-[42px] w-[42px] shrink-0">
                  {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                  <span className="sr-only">Enviar</span>
                </Button>
              </form>
            </div>
          </>
        )}
      </section>

      {/* Coluna 3: Contexto Atual */}
      <aside className="lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-medium text-foreground">Contexto atual</h3>
          </div>

          {!clienteId ? (
            <p className="text-sm text-muted-foreground">
              A IA usa estes dados do cliente para responder com precisão.
            </p>
          ) : carregandoCtx ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando memória...
            </div>
          ) : resumo ? (
            <div className="grid gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{resumo.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {resumo.segmento} · {resumo.status} · desde {resumo.desde}
                </p>
              </div>
              {resumo.objetivo && (
                <div className="rounded-lg bg-muted p-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Objetivo</p>
                  <p className="mt-0.5 text-sm text-foreground">{resumo.objetivo}</p>
                </div>
              )}
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Memória carregada
                </p>
                <ul className="grid gap-1">
                  {resumo.blocos.map((b) => (
                    <li key={b.rotulo} className="flex items-center justify-between text-sm">
                      <span className={cn(b.itens > 0 ? "text-foreground" : "text-muted-foreground")}>{b.rotulo}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          b.itens > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {b.itens}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-pretty text-[11px] leading-relaxed text-muted-foreground">
                Quanto mais preenchido o cadastro do cliente (metas, estratégia, resultados e evolução), mais precisas
                ficam as respostas.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Não foi possível carregar o contexto deste cliente.</p>
          )}
        </div>
      </aside>
    </div>
  )
}

function textoDe(m: UIMessage): string {
  return (m.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

function Bolha({ papel, children }: { papel: string; children: React.ReactNode }) {
  const isUser = papel === "user"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm border border-border bg-background text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  )
}

function Avatar({ cliente }: { cliente: ClienteOpcao }) {
  if (cliente.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cliente.logoUrl || "/placeholder.svg"}
        alt=""
        className="h-8 w-8 shrink-0 rounded-lg object-cover"
      />
    )
  }
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-primary-foreground",
        cliente.cor || "bg-primary",
      )}
    >
      {cliente.iniciais}
    </span>
  )
}
