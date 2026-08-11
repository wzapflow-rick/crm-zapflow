import { NextResponse } from "next/server"
import { getMensagensClientesRecentes } from "@/lib/clientes-db"

export const dynamic = "force-dynamic"

// Polling do sino de notificações: mensagens escritas pelos clientes no portal.
export async function GET() {
  try {
    const mensagens = await getMensagensClientesRecentes(20)
    return NextResponse.json({ mensagens }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ mensagens: [] }, { headers: { "Cache-Control": "no-store" } })
  }
}
