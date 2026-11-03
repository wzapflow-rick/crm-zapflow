"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { salvarObservacoesInternasAction } from "@/app/(crm)/clientes/actions"

export function ObservacoesInternas({ clienteId, valorInicial }: { clienteId: string; valorInicial?: string }) {
  const [texto, setTexto] = useState(valorInicial ?? "")
  const [salvo, setSalvo] = useState(valorInicial ?? "")
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, startSalvar] = useTransition()
  const router = useRouter()
  const alterado = texto !== salvo

  function salvar() {
    setErro(null)
    startSalvar(async () => {
      const res = await salvarObservacoesInternasAction(clienteId, texto)
      if (res.ok) {
        setSalvo(texto)
        router.refresh()
      } else {
        setErro(res.erro ?? "Falha ao salvar.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Só a equipe vê. Não aparece no portal do cliente.
      </p>
      <label htmlFor={`obs-${clienteId}`} className="sr-only">
        Observações internas
      </label>
      <Textarea
        id={`obs-${clienteId}`}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Preferências, combinados, cuidados no atendimento, histórico relevante..."
        rows={6}
        maxLength={10000}
        className="leading-relaxed"
      />
      <div className="flex items-center justify-end gap-3">
        {erro && (
          <p className="mr-auto text-xs text-destructive" role="alert">
            {erro}
          </p>
        )}
        {!alterado && salvo && !salvando && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Salvo
          </span>
        )}
        <Button size="sm" onClick={salvar} disabled={!alterado || salvando}>
          {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Salvar observações
        </Button>
      </div>
    </div>
  )
}
