"use client"

import { useActionState, useEffect, useRef, useState, type KeyboardEvent } from "react"
import { useFormStatus } from "react-dom"
import useSWR from "swr"
import { Send } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { enviarMensagemEquipeAction, type EstadoForm } from "@/app/(crm)/clientes/actions"
import type { Mensagem } from "@/lib/simple-data"
import type { Membro } from "@/lib/membros-db"

const estadoInicial: EstadoForm = { ok: false }

// Busca as mensagens via Route Handler (polling confiável, inclusive no mobile).
async function buscarMensagens(clienteId: string): Promise<Mensagem[]> {
  const res = await fetch(`/api/clientes/${clienteId}/mensagens`, { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao buscar mensagens")
  const json = (await res.json()) as { mensagens: Mensagem[] }
  return json.mensagens ?? []
}

function BotaoEnviar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
      <Send className="h-3.5 w-3.5" />
      {pending ? "Enviando..." : "Enviar"}
    </Button>
  )
}

export function ChatEquipe({
  clienteId,
  clienteNome,
  clienteIniciais,
  clienteCor,
  mensagens,
  membros,
}: {
  clienteId: string
  clienteNome: string
  clienteIniciais: string
  clienteCor: string
  mensagens: Mensagem[]
  membros: Membro[]
}) {
  const [estado, formAction] = useActionState(enviarMensagemEquipeAction, estadoInicial)
  const [autorId, setAutorId] = useState(membros[0]?.id ?? "")
  const formRef = useRef<HTMLFormElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  // Polling: atualiza as mensagens sozinho, sem precisar recarregar a página.
  const { data, mutate } = useSWR(
    ["mensagens-equipe", clienteId],
    () => buscarMensagens(clienteId),
    {
      fallbackData: mensagens,
      refreshInterval: 4000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    },
  )
  const lista = data ?? mensagens

  const membroPorId = (id: string) => membros.find((m) => m.id === id)

  useEffect(() => {
    if (estado.ok) {
      formRef.current?.reset()
      textareaRef.current?.focus()
      mutate() // busca as mensagens atualizadas na hora
    }
  }, [estado, mutate])

  // Rola para a última mensagem quando a lista muda.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [lista.length])

  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envia; Shift+Enter quebra linha. Respeita composição de IMEs (CJK).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card">
      {/* Thread */}
      <div className="max-h-[28rem] min-h-[16rem] overflow-y-auto p-4">
        {lista.length === 0 ? (
          <div className="flex h-full min-h-[14rem] flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-foreground">Nenhuma mensagem ainda</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Escreva abaixo para iniciar a conversa. O cliente recebe direto no portal dele.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {lista.map((m) => {
              const autor = membroPorId(m.autorId)
              const nome = m.deCliente ? m.autorNome || clienteNome : autor?.nome ?? "Equipe SIMPLE"
              const iniciais = m.deCliente ? clienteIniciais : autor?.iniciais ?? "S"
              const cor = m.deCliente ? clienteCor : autor?.cor ?? "bg-primary"
              // Mensagens da equipe (nós) à direita; do cliente à esquerda.
              const daEquipe = !m.deCliente
              return (
                <li key={m.id} className={cn("flex gap-3", daEquipe && "flex-row-reverse")}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={cn(cor, "text-[10px] text-primary-foreground")}>
                      {iniciais}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "min-w-0 max-w-[80%] rounded-2xl border border-border px-4 py-2.5",
                      daEquipe ? "rounded-tr-sm bg-primary/5" : "rounded-tl-sm bg-muted/40",
                    )}
                  >
                    <div className={cn("flex items-center gap-2", daEquipe && "flex-row-reverse")}>
                      <span className="text-sm font-medium text-foreground">{nome}</span>
                      {m.data && <span className="text-[11px] text-muted-foreground">{m.data}</span>}
                      {m.deCliente && (
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                          Cliente
                        </span>
                      )}
                    </div>
                    <p className={cn("mt-1 whitespace-pre-wrap text-pretty text-sm leading-relaxed text-muted-foreground", daEquipe && "text-right")}>
                      {m.texto}
                    </p>
                  </div>
                </li>
              )
            })}
            <div ref={fimRef} />
          </ul>
        )}
      </div>

      {/* Composer */}
      <form ref={formRef} action={formAction} className="border-t border-border p-3">
        <input type="hidden" name="id" value={clienteId} />
        <input type="hidden" name="autorId" value={autorId} />
        <Textarea
          ref={textareaRef}
          name="texto"
          rows={2}
          required
          placeholder="Escreva uma mensagem para o cliente…  (Enter envia, Shift+Enter quebra linha)"
          onKeyDown={aoTeclar}
          className="resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
        {estado.erro && <p className="px-1 pb-2 text-sm text-destructive">{estado.erro}</p>}
        <div className="mt-1 flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Enviando como
            <select
              value={autorId}
              onChange={(e) => setAutorId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Equipe SIMPLE</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </label>
          <BotaoEnviar />
        </div>
      </form>
    </div>
  )
}
