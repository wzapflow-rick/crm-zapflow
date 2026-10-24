"use client"

import { useState } from "react"
import { CheckCircle2, Clapperboard, Copy, Check, Loader2, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  gerarRoteiroConteudoAction,
  salvarRoteiroGeradoAction,
  type RoteiroGerado,
} from "@/app/(crm)/clientes/gerar-roteiro-actions"

const FORMATOS = ["Reels", "Carrossel", "Story", "Vídeo", "Estático"] as const

// Palavras que indicam que a resposta trata de um roteiro/conteúdo de vídeo,
// para só oferecer o atalho quando fizer sentido ("quando peço roteiro").
const PADRAO_ROTEIRO = /roteiro|gancho|\bcena|reels?|v[íi]deo|storytelling|script|grava(r|ção)/i

export function mencionaRoteiro(texto: string): boolean {
  return PADRAO_ROTEIRO.test(texto)
}

// Deriva um título sugerido a partir da pergunta ou da primeira linha útil da resposta.
function sugerirTitulo(pergunta: string, resposta: string): string {
  const base = (pergunta || resposta.split("\n").find((l) => l.trim().length > 8) || "").trim()
  const limpo = base.replace(/^[\s\-•*\d.]+/, "").replace(/["""]/g, "")
  if (!limpo) return ""
  const corte = limpo.length > 70 ? `${limpo.slice(0, 67)}...` : limpo
  return corte.charAt(0).toUpperCase() + corte.slice(1)
}

export function AtalhoRoteiro({
  texto,
  pergunta,
  empresaId,
}: {
  texto: string
  pergunta: string
  empresaId: string
}) {
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [formato, setFormato] = useState<string>("Reels")
  const [instrucao, setInstrucao] = useState("")
  const [gerando, setGerando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)
  const [roteiro, setRoteiro] = useState<RoteiroGerado | null>(null)
  const [ganchoCopiado, setGanchoCopiado] = useState<number | null>(null)

  function abrir() {
    setTitulo(sugerirTitulo(pergunta, texto))
    setFormato("Reels")
    setInstrucao("")
    setRoteiro(null)
    setErro("")
    setSucesso(false)
    setAberto(true)
  }

  async function gerar() {
    if (!titulo.trim()) {
      setErro("Dê um título ao conteúdo antes de gerar.")
      return
    }
    setGerando(true)
    setErro("")
    // O rascunho já discutido no chat entra como base para o roteiro estruturado.
    const baseChat = `Rascunho e direções já discutidos no chat estratégico:\n${texto}`
    const instrucaoFinal = instrucao.trim() ? `${instrucao.trim()}\n\n${baseChat}` : baseChat
    const r = await gerarRoteiroConteudoAction({
      clienteId: empresaId,
      titulo: titulo.trim(),
      formato,
      instrucao: instrucaoFinal,
    })
    setGerando(false)
    if (!r.ok) {
      setErro(r.erro)
      return
    }
    setRoteiro(r.roteiro)
  }

  async function salvar() {
    if (!roteiro) return
    setSalvando(true)
    setErro("")
    const r = await salvarRoteiroGeradoAction({ clienteId: empresaId, titulo: titulo.trim(), formato, roteiro })
    setSalvando(false)
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível salvar.")
      return
    }
    setSucesso(true)
  }

  async function copiarGancho(texto: string, i: number) {
    try {
      await navigator.clipboard.writeText(texto)
      setGanchoCopiado(i)
      setTimeout(() => setGanchoCopiado(null), 1500)
    } catch {
      // Clipboard indisponível: ignora.
    }
  }

  return (
    <>
      <div className="mt-1.5">
        <button
          type="button"
          onClick={abrir}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Clapperboard className="h-3.5 w-3.5" />
          Gerar roteiro estruturado
        </button>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Roteiro estruturado</DialogTitle>
            <DialogDescription>
              A IA transforma o que foi discutido no chat em gancho, cenas, CTA, legenda e direcionamento — e salva no
              pipeline.
            </DialogDescription>
          </DialogHeader>

          {erro && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {erro}
            </div>
          )}

          {sucesso ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Conteúdo salvo no pipeline como ideia. Abra o cliente para revisar e agendar.
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <div className="grid gap-1.5">
                  <Label htmlFor="atalho-titulo">Título do conteúdo</Label>
                  <Input
                    id="atalho-titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex.: 3 erros que travam o faturamento"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="atalho-formato">Formato</Label>
                  <select
                    id="atalho-formato"
                    value={formato}
                    onChange={(e) => setFormato(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {FORMATOS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!roteiro && (
                <div className="grid gap-1.5">
                  <Label htmlFor="atalho-instrucao">Ajuste opcional</Label>
                  <Textarea
                    id="atalho-instrucao"
                    value={instrucao}
                    onChange={(e) => setInstrucao(e.target.value)}
                    rows={2}
                    placeholder="Algum ângulo, oferta ou objetivo específico para este roteiro..."
                    className="resize-y"
                  />
                </div>
              )}

              {roteiro && (
                <div className="grid gap-3 rounded-lg border border-border bg-background p-3">
                  <Secao rotulo="Gancho">{roteiro.gancho}</Secao>
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Cenas</p>
                    <ol className="grid gap-1.5">
                      {roteiro.cenas.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm text-foreground">
                          <span className="font-semibold text-primary">{i + 1}.</span>
                          <span className="text-pretty">{c.descricao}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <Secao rotulo="CTA">{roteiro.cta}</Secao>
                  <Secao rotulo="Legenda">{roteiro.legenda}</Secao>
                  <Secao rotulo="Direcionamento (interno)">{roteiro.direcionamento}</Secao>
                  {roteiro.variacoesGancho.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Variações de gancho (clique para copiar)
                      </p>
                      <ul className="grid gap-1.5">
                        {roteiro.variacoesGancho.map((v, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => copiarGancho(v, i)}
                              className="flex w-full items-start gap-2 rounded-md border border-border px-2.5 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-primary/5"
                            >
                              {ganchoCopiado === i ? (
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                              ) : (
                                <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              )}
                              <span className="text-pretty">{v}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {sucesso ? (
              <Button onClick={() => setAberto(false)}>Fechar</Button>
            ) : roteiro ? (
              <>
                <Button variant="ghost" onClick={gerar} disabled={gerando || salvando}>
                  {gerando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  Gerar de novo
                </Button>
                <Button onClick={salvar} disabled={salvando}>
                  {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                  Salvar no pipeline
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setAberto(false)} disabled={gerando}>
                  <X className="mr-1.5 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={gerar} disabled={gerando}>
                  {gerando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  Gerar roteiro
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Secao({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="whitespace-pre-wrap text-sm text-foreground">{children}</p>
    </div>
  )
}
