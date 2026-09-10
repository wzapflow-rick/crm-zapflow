"use client"

import { useState, useTransition } from "react"
import { BellRing, CheckCircle2, Loader2, Send, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { avisarTodasPendenciasAction, type EnvioAvisoTodos } from "@/app/(crm)/clientes/aviso-pendencias-actions"

// Card em Configurações: dispara, para todos os clientes com conteúdos aguardando
// aprovação, uma mensagem no WhatsApp com o link do portal. O envio automático
// diário roda pelo cron /api/cron/avisar-pendencias às 9h (horário de Brasília).
export function AvisoPendenciasCard() {
  const [resultado, setResultado] = useState<EnvioAvisoTodos | null>(null)
  const [enviando, iniciar] = useTransition()

  const enviar = () => {
    setResultado(null)
    iniciar(async () => {
      const r = await avisarTodasPendenciasAction()
      setResultado(r)
    })
  }

  return (
    <div className="mt-8 rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Avisar conteúdos pendentes</h3>
            <p className="text-xs text-muted-foreground">
              Envia no WhatsApp de cada cliente com conteúdo aguardando aprovação. Automático todo dia às 9h.
            </p>
          </div>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={enviar} disabled={enviando}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Avisar todos agora
        </Button>
      </div>

      <div className="p-4">
        {!resultado && !enviando && (
          <p className="text-sm text-muted-foreground">
            Clique em <span className="font-medium text-foreground">Avisar todos agora</span> para checar todos os
            clientes e disparar o lembrete de aprovação na hora.
          </p>
        )}

        {enviando && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checando clientes e enviando avisos...
          </div>
        )}

        {resultado && !resultado.ok && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {resultado.erro || "Falha ao enviar os avisos."}
          </p>
        )}

        {resultado && resultado.ok && (
          <div className="space-y-3">
            {resultado.total === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum cliente com conteúdos aguardando aprovação no momento. 🎉
              </p>
            ) : (
              <>
                <p className="text-sm text-foreground">
                  <span className="font-semibold text-emerald-500">{resultado.enviados}</span> aviso(s) enviado(s)
                  {resultado.falhas > 0 && (
                    <>
                      {" · "}
                      <span className="font-semibold text-destructive">{resultado.falhas}</span> não enviado(s)
                    </>
                  )}
                  {" de "}
                  {resultado.total} cliente(s) com pendências.
                </p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {resultado.resultados.map((r) => (
                    <li key={r.id} className="flex items-center gap-2.5 px-3 py-2">
                      {r.enviado ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{r.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.pendentes} pendente(s)
                          {!r.enviado && r.motivo ? ` · ${r.motivo}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
