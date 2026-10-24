import { NextResponse } from "next/server"
import { getClientesComPendencias, enviarAvisosPendencias } from "@/lib/aviso-pendencias"

export const dynamic = "force-dynamic"
// Dá folga para a query + envios sequenciais na Evolution.
export const maxDuration = 60

// Aceita a chamada do Vercel Cron (Authorization: Bearer <CRON_SECRET>)
// e também uma chamada manual passando ?key=<CRON_SECRET> (útil para testar).
function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  const url = new URL(req.url)
  return url.searchParams.get("key") === secret
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 })
  }

  try {
    // Modo pré-visualização: mostra quem receberia, sem enviar.
    const url = new URL(req.url)
    if (url.searchParams.get("preview") === "1") {
      const clientes = await getClientesComPendencias()
      return NextResponse.json({
        ok: true,
        preview: true,
        total: clientes.length,
        clientes: clientes.map((c) => ({
          nome: c.nome,
          pendentes: c.pendentes,
          temTelefone: Boolean(c.telefone.replace(/\D/g, "")),
        })),
      })
    }

    const resultados = await enviarAvisosPendencias()
    const enviados = resultados.filter((r) => r.enviado).length
    const falhas = resultados.filter((r) => !r.ok || !r.enviado).length
    return NextResponse.json({ ok: true, total: resultados.length, enviados, falhas, resultados })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 })
  }
}
