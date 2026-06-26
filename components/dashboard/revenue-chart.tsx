"use client"

import { useId } from "react"

type Ponto = { mes: string; valor: number }

export function RevenueChart({ dados }: { dados: Ponto[] }) {
  const gradId = useId()
  const width = 640
  const height = 200
  const padX = 8
  const padY = 16

  const valores = dados.map((d) => d.valor)
  const max = Math.max(...valores) * 1.12
  const min = Math.min(...valores) * 0.88
  const range = max - min || 1

  const stepX = (width - padX * 2) / (dados.length - 1)
  const x = (i: number) => padX + i * stepX
  const y = (v: number) => padY + (1 - (v - min) / range) * (height - padY * 2)

  const linePath = dados
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.valor)}`)
    .join(" ")

  const areaPath =
    `${linePath} L ${x(dados.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Evolução da receita mensal recorrente nos últimos meses"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dados.map((d, i) => (
          <circle
            key={d.mes}
            cx={x(i)}
            cy={y(d.valor)}
            r={i === dados.length - 1 ? 4 : 2.5}
            fill="var(--color-primary)"
            stroke="var(--color-card)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-1">
        {dados.map((d) => (
          <span key={d.mes} className="text-[11px] text-muted-foreground">
            {d.mes}
          </span>
        ))}
      </div>
    </div>
  )
}
