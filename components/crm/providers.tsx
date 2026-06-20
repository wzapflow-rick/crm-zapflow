"use client"

import { createContext, useContext, type ReactNode } from "react"
import { type Membro } from "@/lib/zapflow-data"

type AppContextValue = {
  usuario: Membro
  isAdmin: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export function Providers({
  usuario,
  children,
}: {
  usuario: Membro
  children: ReactNode
}) {
  return (
    <AppContext.Provider value={{ usuario, isAdmin: usuario.papel === "admin" }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp deve ser usado dentro de <Providers>")
  return ctx
}
