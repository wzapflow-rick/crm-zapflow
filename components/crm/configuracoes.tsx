"use client"

import { useState, useTransition } from "react"
import {
  UserPlus,
  Lock,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { type Membro, type Papel } from "@/lib/zapflow-data"
import { criarMembro } from "@/app/actions/crm"
import { useApp } from "@/components/crm/providers"

export function Configuracoes({ membros: membrosIniciais }: { membros: Membro[] }) {
  const { isAdmin } = useApp()
  const [membros, setMembros] = useState<Membro[]>(membrosIniciais)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [cargo, setCargo] = useState("")
  const [telefone, setTelefone] = useState("")
  const [papel, setPapel] = useState<Papel>("atendente")
  const [verSenha, setVerSenha] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null)
  const [pendente, iniciarTransicao] = useTransition()

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
            As configurações e a criação de usuários estão disponíveis apenas
            para administradores.
          </p>
        </div>
      </div>
    )
  }

  function criar() {
    setFeedback(null)
    const dados = { nome, email, senha, papel, telefone, cargo }
    iniciarTransicao(async () => {
      const r = await criarMembro(dados)
      if (r.ok) {
        const iniciais = nome
          .split(" ")
          .map((p) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase()
        setMembros((prev) => [
          ...prev,
          {
            id: `novo-${Date.now()}`,
            nome,
            papel,
            iniciais,
            cor: "bg-chart-2",
            online: false,
            email,
            telefone: telefone || "—",
            cargo: cargo || "A definir",
            entrouEm: "Agora",
            status: "ativo",
          },
        ])
        setFeedback({ tipo: "ok", msg: `Usuário "${nome}" criado com sucesso.` })
        setNome("")
        setEmail("")
        setSenha("")
        setCargo("")
        setTelefone("")
        setPapel("atendente")
      } else {
        setFeedback({ tipo: "erro", msg: r.erro ?? "Erro ao criar usuário." })
      }
    })
  }

  const podeEnviar = nome.trim() && email.trim() && senha.length >= 6 && !pendente

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie usuários e acessos do CRM.
          </p>
        </div>

        {/* Criar novo usuário */}
        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Criar novo usuário
            </h3>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="nome" className="text-xs font-medium text-foreground">
                  Nome completo
                </label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Maria Silva"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-foreground">
                  E-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@zapflow.app"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="senha" className="text-xs font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={verSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {verSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-foreground">Papel</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPapel("atendente")}
                    className={cn(
                      "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm transition-colors",
                      papel === "atendente"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Atendente
                  </button>
                  <button
                    type="button"
                    onClick={() => setPapel("admin")}
                    className={cn(
                      "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm transition-colors",
                      papel === "admin"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="cargo" className="text-xs font-medium text-foreground">
                  Cargo <span className="text-muted-foreground">(opcional)</span>
                </label>
                <Input
                  id="cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Atendimento & vendas"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="telefone" className="text-xs font-medium text-foreground">
                  Telefone <span className="text-muted-foreground">(opcional)</span>
                </label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="+55 79 99999-0000"
                  className="h-9"
                />
              </div>
            </div>

            {feedback ? (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  feedback.tipo === "ok"
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {feedback.tipo === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                {feedback.msg}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={criar} disabled={!podeEnviar} className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                {pendente ? "Criando..." : "Criar usuário"}
              </Button>
            </div>
          </div>
        </section>

        {/* Usuários existentes */}
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold text-foreground">
              Usuários do CRM
            </h3>
            <p className="text-xs text-muted-foreground">
              {membros.length} pessoas com acesso.
            </p>
          </div>
          <div className="divide-y divide-border/60">
            {membros.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={cn(m.cor, "text-xs text-white")}>
                    {m.iniciais}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.nome}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email}
                  </p>
                </div>
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
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
