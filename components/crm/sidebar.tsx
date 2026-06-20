"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageSquare,
  CalendarDays,
  Users,
  LayoutDashboard,
  Settings,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { conversas } from "@/lib/zapflow-data"
import { useApp } from "@/components/crm/providers"

const navItems = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard, adminOnly: false },
  { href: "/inbox", label: "Inbox WhatsApp", icon: MessageSquare, adminOnly: false },
  { href: "/agenda", label: "Planejamento", icon: CalendarDays, adminOnly: false },
  { href: "/equipe", label: "Equipe", icon: Users, adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isAdmin } = useApp()
  const naoLidas = conversas.reduce((acc, c) => acc + c.naoLidas, 0)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">ZapFlow CRM</span>
          <span className="text-[11px] text-sidebar-foreground/60">
            Operação da equipe
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const ativo =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                  ativo
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.href === "/inbox" && naoLidas > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-[11px] font-medium text-sidebar-primary-foreground">
                    {naoLidas}
                  </span>
                )}
              </Link>
            )
          })}
      </nav>

      <div className="px-3 py-4">
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>
      </div>
    </aside>
  )
}
