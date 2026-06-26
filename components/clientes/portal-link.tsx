"use client"

import { useState } from "react"
import { Check, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PortalLink({ token }: { token?: string }) {
  const [copiado, setCopiado] = useState(false)

  if (!token) return null

  async function copiar() {
    const url = `${window.location.origin}/portal/${token}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback para navegadores sem clipboard API
      window.prompt("Copie o link do portal:", url)
      return
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={copiar}>
      {copiado ? <Check className="h-3.5 w-3.5 text-chart-4" /> : <Link2 className="h-3.5 w-3.5" />}
      {copiado ? "Link copiado!" : "Copiar link do portal"}
    </Button>
  )
}
