"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  Users,
  KanbanSquare,
  Megaphone,
  Sparkles,
  Briefcase,
  Wallet,
  BookOpen,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

type NavGroup = {
  titulo: string
  itens: NavItem[]
}

const grupos: NavGroup[] = [
  {
    titulo: "Principal",
    itens: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tarefas", label: "Tarefas", icon: ListChecks },
      { href: "/calendario", label: "Calendário", icon: CalendarDays },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/crm", label: "CRM", icon: KanbanSquare },
      { href: "/metodo", label: "Método SIMPLE", icon: Sparkles },
      { href: "/marketing", label: "Marketing", icon: Megaphone },
    ],
  },
  {
    titulo: "Empresa",
    itens: [
      { href: "/brand-book", label: "Brand Book", icon: BookOpen },
      { href: "/comercial", label: "Comercial", icon: Briefcase },
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
      { href: "/wiki", label: "Wiki", icon: Library },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  const isAtivo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <span className="text-sm font-bold">S</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">SIMPLE OS</span>
          <span className="text-[11px] text-sidebar-foreground/55">
            Sistema operacional
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="mb-5">
            <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
              {grupo.titulo}
            </p>
            <div className="space-y-0.5">
              {grupo.itens.map((item) => {
                const ativo = isAtivo(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      ativo
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3">
        <Link
          href="/configuracoes"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            isAtivo("/configuracoes")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>
      </div>
    </aside>
  )
}
