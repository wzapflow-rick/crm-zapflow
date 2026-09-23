"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { ThemeProvider } from "next-themes"
import type { UsuarioSessao } from "@/lib/tipos-sessao"

type AppContextValue = {
  usuario: UsuarioSessao
  navAberta: boolean
  setNavAberta: (aberta: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function Providers({
  children,
  usuarioInicial,
}: {
  children: ReactNode
  usuarioInicial: UsuarioSessao
}) {
  const [navAberta, setNavAberta] = useState(false)

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange={false}>
      <AppContext.Provider value={{ usuario: usuarioInicial, navAberta, setNavAberta }}>
        {children}
      </AppContext.Provider>
    </ThemeProvider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp deve ser usado dentro de <Providers>")
  return ctx
}
