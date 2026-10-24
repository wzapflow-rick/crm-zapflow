import { NextResponse } from "next/server"
import { getMensagensClientesRecentes } from "@/lib/clientes-db"
import { getTarefasAtrasadas } from "@/lib/tarefas-db"
import { exigirUsuarioApi } from "@/lib/auth"

export const dynamic = "force-dynamic"

// Polling do sino de notificações: mensagens dos clientes + tarefas atrasadas.
export async function GET() {
  const usuario = await exigirUsuarioApi()
  if (usuario instanceof Response) return usuario
  try {
    const [mensagens, tarefasAtrasadas] = await Promise.all([
      getMensagensClientesRecentes(20).catch(() => []),
      getTarefasAtrasadas().catch(() => []),
    ])
    return NextResponse.json(
      { mensagens, tarefasAtrasadas },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch {
    return NextResponse.json(
      { mensagens: [], tarefasAtrasadas: [] },
      { headers: { "Cache-Control": "no-store" } },
    )
  }
}
