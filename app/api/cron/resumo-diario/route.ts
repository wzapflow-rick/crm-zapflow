import { NextResponse } from "next/server"
import { montarResumoDiario } from "@/lib/resumo-diario"
import { enviarTextoWhatsApp } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"
// Dá folga para as queries + envio (Evolution pode demorar alguns segundos).
export const maxDuration = 60

// Aceita a chamada do Vercel Cron (envia "Authorization: Bearer <CRON_SECRET>")
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
    const grupo = process.env.SOCIOS_GROUP_ID
    if (!grupo) {
      return NextResponse.json({ ok: false, erro: "SOCIOS_GROUP_ID não configurado." }, { status: 500 })
    }

    const { texto, temItens } = await montarResumoDiario()

    // Modo pré-visualização: retorna a mensagem montada sem enviar no WhatsApp.
    const url = new URL(req.url)
    if (url.searchParams.get("preview") === "1") {
      return NextResponse.json({ ok: true, preview: true, temItens, texto })
    }

    const envio = await enviarTextoWhatsApp(grupo, texto)

    if (!envio.ok) {
      return NextResponse.json(
        { ok: false, erro: envio.erro, status: envio.status },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, temItens })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 })
  }
}
