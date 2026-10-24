import { NextResponse } from "next/server"
import { getClientesComPendencias, enviarAvisosPendencias } from "@/lib/aviso-pendencias"
import { cronAutorizado } from "@/lib/seguranca"

export const dynamic = "force-dynamic"
// Dá folga para a query + envios sequenciais na Evolution.
export const maxDuration = 60

export async function GET(req: Request) {
  if (!cronAutorizado(req)) {
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
    console.error("[cron] avisar-pendencias falhou:", e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, erro: "Falha ao processar os avisos." }, { status: 500 })
  }
}
