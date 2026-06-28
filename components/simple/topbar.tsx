"use client"

import { Search, Menu } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/simple/providers"

export function Topbar({ titulo }: { titulo: string }) {
  const { usuario, setNavAberta } = useApp()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => setNavAberta(true)}
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-sm font-semibold text-foreground">{titulo}</h1>
      </div>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes, tarefas, conteúdo..."
          className="h-9 bg-background pl-9 text-sm"
        />
      </div>

      <div className="flex items-center gap-2 px-2 py-1.5">
        <Avatar className="h-8 w-8">
          <AvatarFallback className={cn(usuario.cor, "text-xs text-primary-foreground")}>
            {usuario.iniciais}
          </AvatarFallback>
        </Avatar>
        <div className="hidden flex-col items-start leading-tight sm:flex">
          <span className="text-sm font-medium text-foreground">{usuario.nome}</span>
          <span className="text-[10px] text-muted-foreground">{usuario.papel}</span>
        </div>
      </div>
    </header>
  )
}
