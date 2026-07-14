"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { atualizarBannerAction } from "@/app/(crm)/clientes/actions"

// Envia o banner/capa do cliente para o Vercel Blob e salva no banco.
// Fica no perfil do cliente (não no formulário de cadastro).
export function BannerUploader({
  clienteId,
  valorInicial,
}: {
  clienteId: string
  valorInicial?: string
}) {
  const [url, setUrl] = useState(valorInicial ?? "")
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, startSalvar] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function salvar(novaUrl: string) {
    startSalvar(async () => {
      const res = await atualizarBannerAction(clienteId, novaUrl)
      if (res.ok) {
        setUrl(novaUrl)
        router.refresh()
      } else {
        setErro(res.erro ?? "Falha ao salvar o banner.")
      }
    })
  }

  async function enviar(file: File) {
    setErro(null)
    setEnviando(true)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("pasta", "banners-clientes")
      const res = await fetch("/api/upload-logo", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha no upload.")
      salvar(data.url)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar a imagem.")
    } finally {
      setEnviando(false)
    }
  }

  const ocupado = enviando || salvando

  return (
    <div className="grid gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) enviar(file)
          e.target.value = "" // permite reenviar o mesmo arquivo
        }}
      />
      <div className="relative aspect-[4/1] w-full overflow-hidden rounded-xl border border-border bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url || "/placeholder.svg"} alt="Banner do cliente" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-sm text-muted-foreground">Nenhum banner definido</span>
          </div>
        )}
        {ocupado && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={ocupado}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="mr-1.5 h-4 w-4" />
          {url ? "Trocar banner" : "Enviar banner"}
        </Button>
        {url && (
          <Button type="button" variant="ghost" size="sm" disabled={ocupado} onClick={() => salvar("")}>
            <X className="mr-1 h-4 w-4" />
            Remover
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Aparece como capa no topo do portal do cliente. Use proporção 4:1 (ex.: 2000×500px) para não cortar. PNG,
          JPG ou WEBP (máx. 4 MB).
        </p>
      </div>

      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  )
}
