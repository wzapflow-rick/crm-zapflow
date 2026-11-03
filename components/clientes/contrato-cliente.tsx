"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, FileText, Loader2, Upload, X } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { salvarContratoAction } from "@/app/(crm)/clientes/actions"

function formatarData(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR")
}

export function ContratoCliente({
  clienteId,
  url: urlInicial,
  resumo: resumoInicial,
  atualizadoEm,
}: {
  clienteId: string
  url?: string
  resumo?: string
  atualizadoEm?: string
}) {
  const [url, setUrl] = useState(urlInicial ?? "")
  const [resumo, setResumo] = useState(resumoInicial ?? "")
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [salvando, startSalvar] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const ocupado = enviando || salvando
  const alterado = url !== (urlInicial ?? "") || resumo !== (resumoInicial ?? "")

  function salvar(novaUrl: string, novoResumo: string) {
    setErro(null)
    startSalvar(async () => {
      const res = await salvarContratoAction(clienteId, novaUrl, novoResumo)
      if (res.ok) {
        setUrl(novaUrl)
        router.refresh()
      } else {
        setErro(res.erro ?? "Falha ao salvar o contrato.")
      }
    })
  }

  async function enviarArquivo(file: File) {
    setErro(null)
    setEnviando(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/upload-contrato", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha no upload.")
      salvar(data.url, resumo)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar o contrato.")
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">Fica visível aqui e no portal do cliente.</p>

      {urlInicial ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Contrato fixado</p>
            {atualizadoEm && <p className="text-xs text-muted-foreground">Atualizado em {formatarData(atualizadoEm)}</p>}
          </div>
          <a
            href={urlInicial}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Abrir
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            disabled={ocupado}
            onClick={() => {
              setUrl("")
              salvar("", resumo)
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Remover
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          aria-label="Enviar PDF do contrato"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) enviarArquivo(f)
          }}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={ocupado}
            onClick={() => inputRef.current?.click()}
          >
            {enviando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {urlInicial ? "Trocar PDF" : "Enviar PDF"}
          </Button>
          <label htmlFor={`contrato-link-${clienteId}`} className="sr-only">
            Ou cole o link do contrato
          </label>
          <Input
            id={`contrato-link-${clienteId}`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="ou cole o link (Google Drive, Clicksign...)"
            className="h-9 flex-1"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`contrato-resumo-${clienteId}`} className="text-xs font-medium text-foreground">
          Resumo do que foi contratado
        </label>
        <Textarea
          id={`contrato-resumo-${clienteId}`}
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          placeholder="Ex.: 12 Reels + 8 carrosséis por mês, 1 gravação mensal, vigência até 12/2026."
          rows={3}
          maxLength={2000}
          className="leading-relaxed"
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {erro && (
          <p className="mr-auto text-xs text-destructive" role="alert">
            {erro}
          </p>
        )}
        <Button size="sm" disabled={!alterado || ocupado} onClick={() => salvar(url, resumo)}>
          {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Salvar contrato
        </Button>
      </div>
    </div>
  )
}
