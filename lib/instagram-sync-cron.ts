import "server-only"
import type { EstadoSync, OpcoesSync, ResultadoSync } from "@/lib/instagram-sync"

// A função da Vercel dura até 300 s. O prazo das contas fica em 270 s e,
// depois de 240 s, nenhuma conta nova é iniciada.
export const PRAZO_TOTAL_MS = 270_000
export const CORTE_NOVAS_CONTAS_MS = 240_000
export const FOLGA_INTELIGENCIA_MS = 60_000

export type OpcoesSyncDiario = {
  listarContas(): Promise<string[]>
  sincronizar(empresaId: string, opcoes: OpcoesSync): Promise<ResultadoSync>
  aposConcluir?(empresaId: string): Promise<unknown>
  agora(): number
}

export type ResumoSyncDiario = {
  contas: number
  processadas: number
  naoIniciadas: number
  resultados: { empresaId: string; estado: EstadoSync; chamadas: number }[]
}

export async function executarSyncDiario(op: OpcoesSyncDiario): Promise<ResumoSyncDiario> {
  const inicio = op.agora()
  const prazo = inicio + PRAZO_TOTAL_MS
  const contas = await op.listarContas()
  const resultados: ResumoSyncDiario["resultados"] = []
  let naoIniciadas = 0

  for (let i = 0; i < contas.length; i += 1) {
    const empresaId = contas[i]
    if (op.agora() - inicio >= CORTE_NOVAS_CONTAS_MS) {
      naoIniciadas = contas.length - i
      break
    }
    let estado: EstadoSync = "erro"
    let chamadas = 0
    try {
      const r = await op.sincronizar(empresaId, { origem: "cron", prazo })
      estado = r.estado
      chamadas = r.chamadas
    } catch {
      // Uma conta com falha inesperada não interrompe as demais.
    }
    resultados.push({ empresaId, estado, chamadas })
    if (estado === "concluida" && op.aposConcluir && prazo - op.agora() > FOLGA_INTELIGENCIA_MS) {
      await op.aposConcluir(empresaId).catch(() => {})
    }
  }

  return { contas: contas.length, processadas: resultados.length, naoIniciadas, resultados }
}
