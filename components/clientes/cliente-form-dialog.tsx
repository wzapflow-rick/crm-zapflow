"use client"

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { ImagePlus, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { EstadoForm } from "@/app/(crm)/clientes/actions"
import type { Cliente } from "@/lib/simple-data"
import type { Membro } from "@/lib/membros-db"

const estadoInicial: EstadoForm = { ok: false }

type Acao = (prev: EstadoForm, formData: FormData) => Promise<EstadoForm>

function BotaoSalvar({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : children}
    </Button>
  )
}

// <select> nativo estilizado — confiável dentro de modais (sempre abre, funciona no mobile).
const selectClasses =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

// Upload da logo/foto do cliente para o Vercel Blob. Mantém a URL num input
// hidden ("logoUrl") para a server action ler junto do restante do formulário.
function LogoUploader({ nome, valorInicial }: { nome?: string; valorInicial?: string }) {
  const [url, setUrl] = useState(valorInicial ?? "")
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function enviar(file: File) {
    setErro(null)
    setEnviando(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/upload-logo", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha no upload.")
      setUrl(data.url)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar a imagem.")
    } finally {
      setEnviando(false)
    }
  }

  const iniciais = (nome ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"

  return (
    <div className="grid gap-1.5">
      <Label>Logo do cliente</Label>
      <input type="hidden" name="logoUrl" value={url} />
      <div className="flex items-center gap-3">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url || "/placeholder.svg"} alt={`Logo ${nome ?? "do cliente"}`} className="h-full w-full object-cover" />
          ) : (
            <span className="text-base font-semibold text-muted-foreground">{iniciais}</span>
          )}
          {enviando && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={enviando} onClick={() => inputRef.current?.click()}>
              <ImagePlus className="mr-1.5 h-4 w-4" />
              {url ? "Trocar" : "Enviar imagem"}
            </Button>
            {url && (
              <Button type="button" variant="ghost" size="sm" disabled={enviando} onClick={() => setUrl("")}>
                <X className="mr-1 h-4 w-4" />
                Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP ou SVG (máx. 4 MB).</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) enviar(file)
          e.target.value = ""
        }}
      />
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  )
}

export function ClienteFormDialog({
  membros,
  cliente,
  trigger,
  acao,
  titulo,
  descricao,
  textoBotao,
}: {
  membros: Membro[]
  cliente?: Cliente
  trigger: ReactNode
  acao: Acao
  titulo: string
  descricao: string
  textoBotao: string
}) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState(cliente?.nome ?? "")
  const [estado, formAction] = useActionState(acao, estadoInicial)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (estado.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          {cliente && <input type="hidden" name="id" value={cliente.id} />}

          <div className="grid gap-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              name="nome"
              placeholder="Ex.: Clínica Aurora"
              defaultValue={cliente?.nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <LogoUploader nome={nome} valorInicial={cliente?.logoUrl} />

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="segmento">Segmento</Label>
              <Input id="segmento" name="segmento" placeholder="Ex.: Saúde" defaultValue={cliente?.segmento === "—" ? "" : cliente?.segmento} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={cliente?.status ?? "onboarding"} className={selectClasses}>
                <option value="onboarding">Onboarding</option>
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="responsavelId">Responsável</Label>
            <select id="responsavelId" name="responsavelId" defaultValue={cliente?.responsavelId ?? ""} className={selectClasses}>
              <option value="">Sem responsável</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                  {m.cargo ? ` — ${m.cargo}` : ""}
                </option>
              ))}
            </select>
            {membros.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum membro cadastrado ainda. Adicione membros na tabela do banco para vinculá-los.
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="objetivo">Objetivo</Label>
            <Textarea
              id="objetivo"
              name="objetivo"
              placeholder="O que esse cliente quer alcançar com a SIMPLE?"
              rows={3}
              defaultValue={cliente?.objetivo}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="contato">Contato</Label>
              <Input id="contato" name="contato" placeholder="Nome do responsável" defaultValue={cliente?.contato} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" placeholder="(11) 90000-0000" defaultValue={cliente?.telefone} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="mrr">Valor (R$)</Label>
              <Input id="mrr" name="mrr" inputMode="numeric" placeholder="0" defaultValue={cliente && cliente.mrr > 0 ? cliente.mrr : ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="desde">Cliente desde</Label>
              <Input id="desde" name="desde" type="date" defaultValue={cliente?.desdeISO} />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input bg-muted/30 px-3 py-2.5 transition-colors has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5">
            <input
              type="checkbox"
              name="recorrente"
              defaultChecked={cliente?.recorrente ?? true}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium text-foreground">Receita recorrente (mensal)</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                Desmarque para clientes avulsos — quem contratou um serviço pontual (ex.: cobertura de
                evento) e não tem mensalidade. Avulsos não entram na receita recorrente.
              </span>
            </span>
          </label>

          {estado.erro && (
            <p className={cn("rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{estado.erro}</p>
          )}

          <DialogFooter className="mt-1">
            <BotaoSalvar>{textoBotao}</BotaoSalvar>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
