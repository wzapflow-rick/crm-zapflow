import { LinkIcon } from "lucide-react"

export default function PortalNaoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <LinkIcon className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Link inválido</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Este link de portal não é válido ou foi desativado. Peça um novo link ao seu contato na SIMPLE.
        </p>
      </div>
      <span className="font-serif text-base font-semibold tracking-tight text-foreground">SIMPLE</span>
    </div>
  )
}
