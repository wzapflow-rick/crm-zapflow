import { NextResponse } from "next/server"
import { getClientePorToken, getMensagens } from "@/lib/clientes-db"

export const dynamic = "force-dynamic"

// Endpoint de polling do chat no portal do cliente (acesso por token).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const t = (token ?? "").trim()
  if (!t) {
    return NextResponse.json({ mensagens: [] }, { headers: { "Cache-Control": "no-store" } })
  }
  try {
    const cliente = await getClientePorToken(t)
    if (!cliente) {
      return NextResponse.json({ mensagens: [] }, { headers: { "Cache-Control": "no-store" } })
    }
    const mensagens = await getMensagens(cliente.id)
    return NextResponse.json({ mensagens }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ mensagens: [] }, { headers: { "Cache-Control": "no-store" } })
  }
}
