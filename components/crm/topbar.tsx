"use client"

import { Search, ChevronDown, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/crm/providers"
import { sair } from "@/app/actions/auth"

export function Topbar({ titulo }: { titulo: string }) {
  const { usuario } = useApp()

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
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium text-foreground">{usuario.nome}</p>
            {usuario.email ? (
              <p className="truncate text-xs text-muted-foreground">
                {usuario.email}
              </p>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          <form action={sair}>
            <DropdownMenuItem
              render={<button type="submit" className="w-full" />}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
