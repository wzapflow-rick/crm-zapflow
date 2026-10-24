// Estado da conexão mostrado no painel. Função pura (usada no cliente e nos testes).

export const ATRASO_MAXIMO_MS = 36 * 60 * 60 * 1000

export type EstadoConexao =
  | "demo"
  | "sincronizada"
  | "atrasada"
  | "em_andamento"
  | "erro_temporario"
  | "precisa_reconectar"
  | "erro"

export type DadosEstadoConexao = {
  modo: "real" | "demo"
  status: "conectado" | "expirado" | "erro"
  tokenExpiraEm: string | null
  ultimaSync: string | null
  syncBloqueadaAte: string | null
  erroTemporario: boolean
}

export const ROTULO_ESTADO: Record<EstadoConexao, string> = {
  demo: "Demonstração",
  sincronizada: "Sincronizada",
  atrasada: "Sincronização atrasada",
  em_andamento: "Sincronizando",
  erro_temporario: "Erro temporário",
  precisa_reconectar: "Precisa reconectar",
  erro: "Erro na sincronização",
}

export function estadoConexao(c: DadosEstadoConexao, agora: number): EstadoConexao {
  if (c.modo === "demo") return "demo"
  const expira = c.tokenExpiraEm ? Date.parse(c.tokenExpiraEm) : Number.NaN
  if (c.status === "expirado" || (Number.isFinite(expira) && expira <= agora)) return "precisa_reconectar"
  if (c.syncBloqueadaAte && Date.parse(c.syncBloqueadaAte) > agora) return "em_andamento"
  if (c.erroTemporario) return "erro_temporario"
  if (c.status === "erro") return "erro"
  const ultima = c.ultimaSync ? Date.parse(c.ultimaSync) : Number.NaN
  if (!Number.isFinite(ultima) || agora - ultima > ATRASO_MAXIMO_MS) return "atrasada"
  return "sincronizada"
}
