"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Loader2, MessageCircle, Send, RefreshCw, QrCode } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  diagnosticarWhatsAppAction,
  enviarResumoAgoraAction,
  reconectarWhatsAppAction,
  type DiagnosticoWhatsApp,
  type ReconexaoWhatsApp,
} from "@/app/(crm)/configuracoes/whatsapp-actions"

type StatusEnvio = { tipo: "ok" | "erro"; msg: string } | null

const CONEXAO_LABEL: Record<string, string> = {
  conectado: "Conectado",
  desconectado: "Desconectado",
  conectando: "Conectando...",
  desconhecido: "Desconhecido",
}

function LinhaStatus({
  ok,
  alerta,
  titulo,
  detalhe,
}: {
  ok: boolean
  alerta?: boolean
  titulo: string
  detalhe?: string
}) {
  const Icone = ok ? CheckCircle2 : alerta ? AlertTriangle : XCircle
  const cor = ok ? "text-emerald-500" : alerta ? "text-amber-500" : "text-destructive"
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icone className={cn("mt-0.5 h-4 w-4 shrink-0", cor)} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        {detalhe && <p className="truncate text-xs text-muted-foreground">{detalhe}</p>}
      </div>
    </div>
  )
}

export function WhatsAppDiagnostico() {
  const [diag, setDiag] = useState<DiagnosticoWhatsApp | null>(null)
  const [statusEnvio, setStatusEnvio] = useState<StatusEnvio>(null)
  const [reconexao, setReconexao] = useState<ReconexaoWhatsApp | null>(null)
  const [verificando, iniciarVerificacao] = useTransition()
  const [enviando, iniciarEnvio] = useTransition()
  const [reconectando, iniciarReconexao] = useTransition()

  const verificar = () => {
    setStatusEnvio(null)
    setReconexao(null)
    iniciarVerificacao(async () => {
      const r = await diagnosticarWhatsAppAction()
      setDiag(r)
    })
  }

  const reconectar = () => {
    setReconexao(null)
    iniciarReconexao(async () => {
      const r = await reconectarWhatsAppAction()
      setReconexao(r)
      // Se reconectou de imediato, atualiza o diagnóstico.
      if (r.ok && r.jaConectado) {
        const d = await diagnosticarWhatsAppAction()
        setDiag(d)
      }
    })
  }

  const enviarAgora = () => {
    setStatusEnvio(null)
    iniciarEnvio(async () => {
      const r = await enviarResumoAgoraAction()
      setStatusEnvio(
        r.ok
          ? { tipo: "ok", msg: "Mensagem de bom dia enviada no grupo com sucesso!" }
          : { tipo: "erro", msg: r.erro || "Falha ao enviar." },
      )
    })
  }

  const estado = diag?.estado

  return (
    <div className="mt-8 rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Bom dia no WhatsApp</h3>
            <p className="text-xs text-muted-foreground">
              Resumo diário enviado ao grupo dos sócios todo dia às 7h.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" onClick={verificar} disabled={verificando}>
          {verificando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Verificar conexão
        </Button>
      </div>

      <div className="p-4">
        {!diag && !verificando && (
          <p className="text-sm text-muted-foreground">
            Clique em <span className="font-medium text-foreground">Verificar conexão</span> para checar se a
            integração está ativa e ver a prévia da mensagem de hoje.
          </p>
        )}

        {verificando && !diag && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
          </div>
        )}

        {estado && (
          <div className="divide-y divide-border">
            <LinhaStatus
              ok={estado.configurado}
              titulo="Integração Evolution API"
              detalhe={estado.configurado ? "URL, chave e instância configuradas." : estado.erro}
            />
            <LinhaStatus
              ok={estado.grupoConfigurado}
              titulo="Grupo dos sócios"
              detalhe={estado.grupoConfigurado ? "ID do grupo configurado." : "SOCIOS_GROUP_ID ausente."}
            />
            <LinhaStatus
              ok={estado.conexao === "conectado"}
              alerta={estado.conexao === "conectando" || estado.conexao === "desconhecido"}
              titulo={`Conexão do WhatsApp: ${CONEXAO_LABEL[estado.conexao] ?? estado.conexao}`}
              detalhe={
                estado.conexao === "desconectado"
                  ? "A sessão do WhatsApp caiu. Clique em Reconectar para ler o QR code."
                  : estado.conexao === "conectado"
                    ? "Sessão ativa e pronta para enviar."
                    : estado.conexao === "conectando"
                      ? "Aguardando leitura do QR code. Clique em Reconectar para gerar um novo."
                      : estado.erro
              }
            />
          </div>
        )}

        {estado && estado.configurado && estado.conexao !== "conectado" && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Reconectar o WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  Gere o QR code e leia no celular: WhatsApp {"→"} Aparelhos conectados {"→"} Conectar aparelho.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 bg-transparent"
                onClick={reconectar}
                disabled={reconectando}
              >
                {reconectando ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Reconectar
              </Button>
            </div>

            {reconexao?.jaConectado && (
              <p className="mt-3 text-sm text-emerald-500">A instância já está conectada. Tente enviar o bom dia.</p>
            )}
            {reconexao?.erro && (
              <p className="mt-3 text-sm text-destructive">{reconexao.erro}</p>
            )}
            {reconexao?.qrBase64 && (
              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="rounded-lg bg-white p-2">
                  <Image
                    src={reconexao.qrBase64 || "/placeholder.svg"}
                    alt="QR code para reconectar o WhatsApp"
                    width={224}
                    height={224}
                    unoptimized
                    className="h-56 w-56"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Depois de ler, clique em <span className="font-medium text-foreground">Verificar conexão</span>.
                </p>
              </div>
            )}
            {reconexao?.pairingCode && (
              <p className="mt-3 text-center text-sm text-foreground">
                Ou digite este código no celular:{" "}
                <span className="font-mono font-semibold tracking-widest">{reconexao.pairingCode}</span>
              </p>
            )}
          </div>
        )}

        {diag?.erroPrevia && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Erro ao montar a mensagem: {diag.erroPrevia}
          </p>
        )}

        {diag?.previa && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prévia da mensagem de hoje
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
              {diag.previa}
            </pre>
          </div>
        )}

        {diag && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button className="gap-1.5" onClick={enviarAgora} disabled={enviando}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar bom dia agora
            </Button>
            {statusEnvio && (
              <p
                className={cn(
                  "text-sm",
                  statusEnvio.tipo === "ok" ? "text-emerald-500" : "text-destructive",
                )}
              >
                {statusEnvio.msg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
