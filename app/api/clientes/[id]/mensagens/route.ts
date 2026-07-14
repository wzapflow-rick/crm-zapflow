import { NextResponse } from "next/server"
import { getMensagens } from "@/lib/clientes-db"

export const dynamic = "force-dynamic"

// Endpoint de polling do chat no painel da equipe (por id do cliente).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const clienteId = (id ?? "").trim()
  if (!clienteId) {
    return NextResponse.json({ mensagens: [] }, { headers: { "Cache-Control": "no-store" } })
  }
  try {
    const mensagens = await getMensagens(clienteId)
    return NextResponse.json({ mensagens }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ mensagens: [] }, { headers: { "Cache-Control": "no-store" } })
  }
}
