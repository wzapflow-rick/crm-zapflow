import type { LucideIcon } from "lucide-react"
import { Topbar } from "@/components/simple/topbar"

export function EmBreve({
  titulo,
  descricao,
  icon: Icon,
}: {
  titulo: string
  descricao: string
  icon: LucideIcon
}) {
  return (
    <>
      <Topbar titulo={titulo} />
      <main className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
            {titulo}
          </h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            {descricao}
          </p>
          <span className="mt-5 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            Em breve nesta versão do SIMPLE OS
          </span>
        </div>
      </main>
    </>
  )
}
