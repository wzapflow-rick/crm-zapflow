"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { fundadores, type Fundador } from "@/lib/simple-data"

type AppContextValue = {
  usuario: Fundador
  setUsuario: (f: Fundador) => void
  navAberta: boolean
  setNavAberta: (aberta: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function Providers({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Fundador>(fundadores[0])
  const [navAberta, setNavAberta] = useState(false)

  return (
    <AppContext.Provider value={{ usuario, setUsuario, navAberta, setNavAberta }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp deve ser usado dentro de <Providers>")
  return ctx
}
