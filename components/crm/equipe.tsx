"use client"

import { useState } from "react"
import {
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  MoreVertical,
  UserPlus,
  Lock,
  MessageSquare,
  KanbanSquare,
  CheckSquare,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  membros as membrosIniciais,
  conversas,
  negocios,
  tarefas,
  type Membro,
  type Papel,
} from "@/lib/zapflow-data"
import { useApp } from "@/components/crm/providers"

const statusLabel: Record<Membro["status"], string> = {
  ativo: "Ativo",
  convite_pendente: "Convite pendente",
  inativo: "Inativo",
}

const statusClasses: Record<Membro["status"], string> = {
  ativo: "bg-primary/10 text-primary",
  convite_pendente: "bg-chart-3/15 text-chart-3",
  inativo: "bg-muted text-muted-foreground",
}

export function Equipe() {
  const { isAdmin } = useApp()
  const [membros, setMembros] = useState<Membro[]>(membrosIniciais)
  const [convite, setConvite] = useState("")

  function alterarPapel(id: string, papel: Papel) {
    setMembros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, papel } : m)),
    )
  }

  function convidar() {
    const email = convite.trim()
    if (!email) return
    const nome = email.split("@")[0]
    const iniciais = nome.slice(0, 2).toUpperCase()
    const cores = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]
    setMembros((prev) => [
      ...prev,
      {
        id: `u${prev.length + 1}`,
        nome,
        papel: "atendente",
        iniciais,
        cor: cores[prev.length % cores.length],
        online: false,
        email,
        telefone: "—",
        cargo: "A definir",
        entrouEm: "Agora",
        status: "convite_pendente",
      },
    ])
    setConvite("")
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">
            Acesso restrito
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A gestão de equipe está disponível apenas para administradores.
            Fale com um admin para alterar papéis ou convidar pessoas.
          </p>
        </div>
      </div>
    )
  }

  const metricas = (id: string) => ({
    conversas: conversas.filter((c) => c.responsavelId === id).length,
    negocios: negocios.filter((n) => n.responsavelId === id).length,
    tarefas: tarefas.filter((t) => t.responsavelId === id && t.status !== "concluida").length,
  })

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Equipe</h2>
            <p className="text-sm text-muted-foreground">
              {membros.length} pessoas · gerencie papéis e acessos do CRM.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={convite}
              onChange={(e) => setConvite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && convidar()}
              placeholder="email@empresa.com"
              type="email"
              className="h-9 w-56"
            />
            <Button onClick={convidar} className="h-9 gap-1.5">
              <UserPlus className="h-4 w-4" />
              Convidar
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="hidden border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[1.6fr_1fr_1.4fr_auto]">
            <span>Membro</span>
            <span>Papel</span>
            <span>Atividade</span>
            <span className="sr-only">Ações</span>
          </div>
          <div className="divide-y divide-border/60">
            {membros.map((m) => {
              const stats = metricas(m.id)
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-1 gap-3 px-4 py-3.5 md:grid-cols-[1.6fr_1fr_1.4fr_auto] md:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={cn(m.cor, "text-xs text-white")}>
                          {m.iniciais}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                          m.online ? "bg-primary" : "bg-muted-foreground/40",
                        )}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {m.nome}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {m.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {m.telefone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "gap-1",
                        m.papel === "admin"
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {m.papel === "admin" ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                      {m.papel === "admin" ? "Admin" : "Atendente"}
                    </Badge>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        statusClasses[m.status],
                      )}
                    >
                      {statusLabel[m.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1" title="Conversas atribuídas">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {stats.conversas}
                    </span>
                    <span className="flex items-center gap-1" title="Negócios no pipeline">
                      <KanbanSquare className="h-3.5 w-3.5" />
                      {stats.negocios}
                    </span>
                    <span className="flex items-center gap-1" title="Tarefas em aberto">
                      <CheckSquare className="h-3.5 w-3.5" />
                      {stats.tarefas}
                    </span>
                    <span className="hidden text-muted-foreground/70 lg:inline">
                      · desde {m.entrouEm}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Ações de {m.nome}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => alterarPapel(m.id, "admin")}>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Tornar admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alterarPapel(m.id, "atendente")}>
                          <Shield className="mr-2 h-4 w-4" />
                          Tornar atendente
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          Remover do CRM
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
