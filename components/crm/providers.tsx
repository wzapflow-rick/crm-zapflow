"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { membros, type Membro } from "@/lib/zapflow-data"

type AppContextValue = {
  usuario: Membro
  setUsuario: (m: Membro) => void
  isAdmin: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export function Providers({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Membro>(membros[0])

  return (
    <AppContext.Provider
      value={{ usuario, setUsuario, isAdmin: usuario.papel === "admin" }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp deve ser usado dentro de <Providers>")
  return ctx
}
