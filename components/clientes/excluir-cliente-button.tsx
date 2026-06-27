"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { excluirClienteAction } from "@/app/(crm)/clientes/actions"

export function ExcluirClienteButton({
  clienteId,
  clienteNome,
  variant = "icone",
  redirecionarApos,
}: {
  clienteId: string
  clienteNome: string
  // "icone": botão compacto (card da lista) · "botao": botão com texto (detalhe)
  variant?: "icone" | "botao"
  redirecionarApos?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()
  const router = useRouter()

  // Evita que o clique navegue pelo <Link> que envolve o card.
  const abrir = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setErro(null)
    setAberto(true)
  }

  const confirmar = () => {
    startTransition(async () => {
      // Com redirecionarApos, a action redireciona no servidor (evita o 404 da rota de detalhe).
      // Sem ele (lista), apenas revalida e atualizamos a lista no cliente.
      const res = await excluirClienteAction(clienteId, redirecionarApos)
      // Só chega aqui quando NÃO houve redirect (ex.: exclusão pela lista ou erro).
      if (res?.ok) {
        setAberto(false)
        router.refresh()
      } else if (res?.erro) {
        setErro(res.erro)
      }
    })
  }

  return (
    <>
      {variant === "icone" ? (
        <button
          type="button"
          onClick={abrir}
          aria-label={`Excluir ${clienteNome}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={abrir}
          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </Button>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
            <DialogDescription>
              {`Tem certeza que deseja excluir "${clienteNome}"? Esta ação remove o cliente e todos os dados vinculados (metas, calendário, conteúdos, arquivos, resultados e mensagens). Não é possível desfazer.`}
            </DialogDescription>
          </DialogHeader>

          {erro && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-pretty leading-relaxed">{erro}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={pendente}>
              Cancelar
            </Button>
            <Button
              onClick={confirmar}
              disabled={pendente}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pendente ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
