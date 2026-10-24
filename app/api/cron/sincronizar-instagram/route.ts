import { NextResponse } from "next/server"
import { cronAutorizado } from "@/lib/seguranca"
import { sincronizarConta } from "@/lib/instagram-sync"
import { depsSyncPadrao, listarContasParaSyncDiario } from "@/lib/instagram-sync-repo"
import { executarSyncDiario } from "@/lib/instagram-sync-cron"
import { atualizarInteligenciaConfiavel } from "@/lib/atualizacao-inteligencia"

export const dynamic = "force-dynamic"
// Máximo do plano atual com Fluid compute. A rotina para de iniciar contas
// novas em 240 s e encerra a coleta em 270 s.
export const maxDuration = 300

export async function GET(req: Request) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 })
  }
  const deps = depsSyncPadrao()
  const resumo = await executarSyncDiario({
    listarContas: listarContasParaSyncDiario,
    sincronizar: (empresaId, opcoes) => sincronizarConta(empresaId, opcoes, deps),
    aposConcluir: (empresaId) => atualizarInteligenciaConfiavel(empresaId),
    agora: () => Date.now(),
  })
  console.info("[instagram-sync] rotina diária", {
    contas: resumo.contas,
    processadas: resumo.processadas,
    naoIniciadas: resumo.naoIniciadas,
  })
  return NextResponse.json({ ok: true, ...resumo })
}
