"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ConfiguracoesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-background p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground text-balance">
            Não foi possível carregar as configurações
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Ocorreu um erro ao processar a solicitação. Isso costuma acontecer quando algum serviço externo (como a
            Evolution API do WhatsApp) está fora do ar. Tente novamente.
          </p>
        </div>
        <Button onClick={reset} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    </main>
  )
}
