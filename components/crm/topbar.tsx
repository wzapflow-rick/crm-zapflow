"use client"

import { Search, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { membros } from "@/lib/zapflow-data"
import { useApp } from "@/components/crm/providers"

export function Topbar({ titulo }: { titulo: string }) {
  const { usuario, setUsuario } = useApp()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-5">
      <h1 className="text-sm font-semibold text-foreground">{titulo}</h1>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar contatos, conversas..."
          className="h-9 bg-background pl-9 text-sm"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-accent">
          <Avatar className="h-8 w-8">
            <AvatarFallback className={cn(usuario.cor, "text-xs text-white")}>
              {usuario.iniciais}
            </AvatarFallback>
          </Avatar>
          <div className="hidden flex-col items-start leading-tight sm:flex">
            <span className="text-sm font-medium text-foreground">
              {usuario.nome}
            </span>
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[10px] font-normal capitalize"
            >
              {usuario.papel}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Entrar como (demo de papéis)
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {membros.map((m) => (
            <DropdownMenuItem
              key={m.id}
              onClick={() => setUsuario(m)}
              className="gap-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className={cn(m.cor, "text-[10px] text-white")}>
                  {m.iniciais}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm">{m.nome}</span>
              <span className="text-[10px] capitalize text-muted-foreground">
                {m.papel}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
