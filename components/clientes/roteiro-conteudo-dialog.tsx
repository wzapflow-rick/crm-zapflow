"use client"

import { useActionState, useEffect, useState, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Link2, Lock, Plus, Trash2, ExternalLink } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { salvarRoteiroConteudoAction, type EstadoForm } from "@/app/(crm)/clientes/actions"
import type { LinkConteudo } from "@/lib/simple-data"

const estadoInicial: EstadoForm = { ok: false }

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar roteiro"}
    </Button>
  )
}

export function RoteiroConteudoDialog({
  clienteId,
  conteudoId,
  titulo,
  formato,
  roteiro,
  legenda,
  direcionamento,
  links,
  referencia,
  trigger,
}: {
  clienteId: string
  conteudoId: string
  titulo: string
  formato: string
  roteiro: string
  legenda: string
  direcionamento: string
  links: LinkConteudo[]
  referencia: string
  trigger: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState(roteiro)
  const [valorLegenda, setValorLegenda] = useState(legenda)
  const [valorDirecionamento, setValorDirecionamento] = useState(direcionamento)
  const [valorLinks, setValorLinks] = useState<LinkConteudo[]>(links)
  const [valorReferencia, setValorReferencia] = useState(referencia)
  const [estado, formAction] = useActionState(salvarRoteiroConteudoAction, estadoInicial)
  const router = useRouter()

  // Recarrega roteiro, legenda, direcionamento, links e referência sempre que o diálogo abre.
  useEffect(() => {
    if (aberto) {
      setValor(roteiro)
      setValorLegenda(legenda)
      setValorDirecionamento(direcionamento)
      setValorLinks(links)
      setValorReferencia(referencia)
    }
  }, [aberto, roteiro, legenda, direcionamento, links, referencia])

  const atualizarLink = (i: number, campo: keyof LinkConteudo, v: string) => {
    setValorLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: v } : l)))
  }
  const adicionarLink = () => setValorLinks((prev) => [...prev, { rotulo: "", url: "" }])
  const removerLink = (i: number) => setValorLinks((prev) => prev.filter((_, idx) => idx !== i))

  const linksJson = JSON.stringify(valorLinks.map((l) => ({ rotulo: l.rotulo, url: l.url })))

  // Só habilita o botão "abrir" quando é um link http/https bem formado (segurança + evita abrir lixo).
  const referenciaValida = (() => {
    const v = valorReferencia.trim()
    if (!v) return false
    try {
      const u = new URL(v)
      return u.protocol === "http:" || u.protocol === "https:"
    } catch {
      return false
    }
  })()

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-pretty">{titulo}</DialogTitle>
          <DialogDescription>
            Conteúdo ({formato}): roteiro, legenda, links do drive e referência — tudo em um só lugar.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="conteudoId" value={conteudoId} />
          <input type="hidden" name="links" value={linksJson} />
          <input type="hidden" name="referencia" value={valorReferencia} />

          <div className="grid gap-1.5">
            <Label htmlFor="roteiro">Roteiro</Label>
            <Textarea
              id="roteiro"
              name="roteiro"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              rows={10}
              placeholder="Escreva o roteiro do conteúdo aqui..."
              className="field-sizing-fixed resize-y"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="legenda">Sugestão de legenda</Label>
            <Textarea
              id="legenda"
              name="legenda"
              value={valorLegenda}
              onChange={(e) => setValorLegenda(e.target.value)}
              rows={5}
              placeholder="Escreva a sugestão de legenda para a publicação..."
              className="field-sizing-fixed resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Texto sugerido para acompanhar a publicação (chamada, hashtags, CTA).
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Links do conteúdo</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={adicionarLink}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar link
              </Button>
            </div>
            {valorLinks.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                Nenhum link. Adicione links do drive (vídeo bruto, editado, arte...).
              </p>
            )}
            {valorLinks.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  aria-label="Rótulo do link"
                  placeholder="Ex.: Vídeo editado"
                  value={l.rotulo}
                  onChange={(e) => atualizarLink(i, "rotulo", e.target.value)}
                  className="w-36 shrink-0"
                />
                <Input
                  type="url"
                  inputMode="url"
                  aria-label="URL do link"
                  placeholder="https://drive.google.com/..."
                  value={l.url}
                  onChange={(e) => atualizarLink(i, "url", e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removerLink(i)}
                  aria-label="Remover link"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="referencia" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              Link de referência
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="referencia"
                type="url"
                inputMode="url"
                value={valorReferencia}
                onChange={(e) => setValorReferencia(e.target.value)}
                placeholder="https://... (opcional)"
              />
              {referenciaValida && (
                <a
                  href={valorReferencia.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir link em nova aba"
                  className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Abrir link de referência em nova aba</span>
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Vídeo ou post que serve de referência para este conteúdo.
              {referenciaValida ? " Clique no ícone para abrir em uma nova aba." : ""}
            </p>
          </div>

          <div className="grid gap-1.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <Label htmlFor="direcionamento" className="text-amber-600 dark:text-amber-400">
                Direcionamento interno
              </Label>
            </div>
            <Textarea
              id="direcionamento"
              name="direcionamento"
              value={valorDirecionamento}
              onChange={(e) => setValorDirecionamento(e.target.value)}
              rows={5}
              placeholder="Orientações de filmagem para o videomaker e de aparência visual para o design gráfico..."
              className="field-sizing-fixed resize-y bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Visível somente para a equipe. Nunca aparece no portal do cliente.
            </p>
          </div>

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
