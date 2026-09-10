"use client"

import { cn } from "@/lib/utils"
import { rotuloCompetencia } from "@/lib/meses"

// Pílulas de mês: clique para ver apenas os conteúdos daquele mês.
export function MesesSelector({
  meses,
  ativo,
  onSelecionar,
  className,
}: {
  meses: string[]
  ativo: string
  onSelecionar: (mes: string) => void
  className?: string
}) {
  if (meses.length === 0) return null

  return (
    <div className={cn("mb-3 flex flex-wrap gap-1.5", className)}>
      {meses.map((mes) => (
        <button
          key={mes}
          type="button"
          onClick={() => onSelecionar(mes)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            mes === ativo
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
          )}
        >
          {rotuloCompetencia(mes)}
        </button>
      ))}
    </div>
  )
}
