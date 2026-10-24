import "server-only"
import type { PerfilInstagram } from "@/lib/instagram-api"
import {
  ErroMeta,
  MENSAGENS_ERRO,
  OrcamentoEsgotado,
  erroFatalDaConta,
  type ClienteGraph,
  type MidiaBase,
  type ResultadoInsights,
} from "@/lib/instagram-graph"

// Sincronização única do Instagram, usada pelo botão manual, pela rotina
// diária e pelo retorno do OAuth. Grava a cada lote, usa trava com
// identificador da execução e nunca apaga métricas anteriores em caso de falha.

const DIA_MS = 86_400_000
export const TAMANHO_LOTE = 6
export const TRAVA_VALIDADE_MS = 10 * 60 * 1000
export const MAX_CHAMADAS_POR_CONTA = 400
export const MAX_PAGINAS = 100
export const MIN_PAGINAS = 2
export const LIMITE_PENDENTES_POR_EXECUCAO = 100
export const JANELA_DIARIA_DIAS = 60
export const JANELA_SEMANAL_DIAS = 90
export const RENOVAR_COM_DIAS = 15
const VALIDADE_TOKEN_DIAS = 60

export type ConexaoSync = {
  modo: "real" | "demo"
  status: "conectado" | "expirado" | "erro"
  tokenExpiraEm: Date | null
  ultimaSync: Date | null
}

export type AlvoMetricas = { id: string; tipo: string }
export type MetricasDoPost = ResultadoInsights & { id: string }

export type RegistroResultado = {
  sucesso: boolean
  expirado: boolean
  erroTemporario: boolean
  erroCodigo: string | null
  erroMensagem: string | null
}

export interface RepoSync {
  obterConexao(empresaId: string): Promise<ConexaoSync | null>
  obterToken(empresaId: string): Promise<string | null>
  adquirirTrava(empresaId: string, syncToken: string, validadeMs: number): Promise<boolean>
  liberarTrava(empresaId: string, syncToken: string): Promise<void>
  salvarTokenRenovado(empresaId: string, syncToken: string, token: string, expiraEm: Date): Promise<void>
  atualizarPerfil(empresaId: string, syncToken: string, perfil: PerfilInstagram): Promise<void>
  salvarMidiasBase(empresaId: string, midias: MidiaBase[]): Promise<void>
  listarAlvosJanela(empresaId: string, desde: Date): Promise<AlvoMetricas[]>
  listarPendentesAntigos(empresaId: string, antesDe: Date, limite: number): Promise<AlvoMetricas[]>
  salvarMetricas(empresaId: string, resultados: MetricasDoPost[]): Promise<void>
  registrarResultado(empresaId: string, syncToken: string, registro: RegistroResultado): Promise<void>
}

export type DepsSync = {
  repo: RepoSync
  criarCliente(token: string, maxChamadas: number): ClienteGraph
  gerarId(): string
  agora(): number
  log?(evento: string, dados: Record<string, unknown>): void
}

export type OrigemSync = "manual" | "cron" | "oauth"
export type OpcoesSync = { origem: OrigemSync; prazo: number; maxChamadas?: number }

export type EstadoSync =
  | "concluida"
  | "parcial"
  | "bloqueada"
  | "precisa_reconectar"
  | "limite"
  | "erro_temporario"
  | "erro"
  | "ignorada"

export type ResultadoSync = {
  empresaId: string
  estado: EstadoSync
  mensagem: string
  postsListados: number
  metricasAtualizadas: number
  pendentes: number
  chamadas: number
}

class Interrompida extends Error {
  constructor() {
    super("Tempo da execução esgotado.")
    this.name = "Interrompida"
  }
}

const MSG_PARCIAL = "Coleta parcial: o restante continua na próxima execução."
const MSG_RENOVACAO = "Não foi possível renovar o token agora. Nova tentativa na próxima sincronização."

export function precisaRenovarToken(expiraEm: Date | null, agora: number): boolean {
  if (!expiraEm) return false
  const restante = expiraEm.getTime() - agora
  if (restante <= 0) return false
  // A Meta só renova tokens com mais de 24 h; o token longo vale 60 dias.
  const idade = VALIDADE_TOKEN_DIAS * DIA_MS - restante
  return restante <= RENOVAR_COM_DIAS * DIA_MS && idade >= DIA_MS
}

export function inicioJanela(agora: number, primeira: boolean): number {
  const domingo = new Date(agora).getUTCDay() === 0
  const dias = primeira || domingo ? JANELA_SEMANAL_DIAS : JANELA_DIARIA_DIAS
  return agora - dias * DIA_MS
}

function menorData(itens: MidiaBase[]): number | null {
  let menor: number | null = null
  for (const m of itens) {
    const t = m.publicadoEm ? Date.parse(m.publicadoEm) : Number.NaN
    if (Number.isFinite(t) && (menor === null || t < menor)) menor = t
  }
  return menor
}

function classificarFalha(e: unknown): { estado: EstadoSync; registro: RegistroResultado } {
  if (e instanceof Interrompida || e instanceof OrcamentoEsgotado) {
    return {
      estado: "parcial",
      registro: {
        sucesso: false,
        expirado: false,
        erroTemporario: true,
        erroCodigo: e instanceof Interrompida ? "tempo_esgotado" : "limite_chamadas",
        erroMensagem: MSG_PARCIAL,
      },
    }
  }
  if (e instanceof ErroMeta) {
    const base = { sucesso: false, erroCodigo: e.codigo, erroMensagem: e.message }
    if (e.tipo === "reconectar") {
      return { estado: "precisa_reconectar", registro: { ...base, expirado: true, erroTemporario: false } }
    }
    if (e.tipo === "limite") return { estado: "limite", registro: { ...base, expirado: false, erroTemporario: true } }
    if (e.tipo === "temporario") {
      return { estado: "erro_temporario", registro: { ...base, expirado: false, erroTemporario: true } }
    }
    return { estado: "erro", registro: { ...base, expirado: false, erroTemporario: false } }
  }
  return {
    estado: "erro",
    registro: {
      sucesso: false,
      expirado: false,
      erroTemporario: true,
      erroCodigo: "interno",
      erroMensagem: "Erro interno na sincronização. Nova tentativa na próxima execução.",
    },
  }
}

export async function sincronizarConta(empresaId: string, opcoes: OpcoesSync, deps: DepsSync): Promise<ResultadoSync> {
  const { repo } = deps
  const resultado: ResultadoSync = {
    empresaId,
    estado: "concluida",
    mensagem: "",
    postsListados: 0,
    metricasAtualizadas: 0,
    pendentes: 0,
    chamadas: 0,
  }

  const conexao = await repo.obterConexao(empresaId)
  if (!conexao) return { ...resultado, estado: "ignorada", mensagem: "Nenhuma conta conectada." }
  if (conexao.modo === "demo") {
    return { ...resultado, estado: "ignorada", mensagem: "Contas de demonstração não são sincronizadas com a Meta." }
  }
  if (opcoes.origem === "cron" && conexao.status === "expirado") {
    return { ...resultado, estado: "precisa_reconectar", mensagem: MENSAGENS_ERRO.reconectar }
  }

  const syncToken = deps.gerarId()
  if (!(await repo.adquirirTrava(empresaId, syncToken, TRAVA_VALIDADE_MS))) {
    return { ...resultado, estado: "bloqueada", mensagem: "Sincronização já em andamento para esta conta." }
  }

  let registro: RegistroResultado = classificarFalha(new Interrompida()).registro
  let cliente: ClienteGraph | null = null

  try {
    const token = await repo.obterToken(empresaId)
    const agora = deps.agora()
    if (!token) throw new ErroMeta("reconectar", "token_ausente")
    if (conexao.tokenExpiraEm && conexao.tokenExpiraEm.getTime() <= agora) {
      throw new ErroMeta("reconectar", "token_expirado")
    }
    cliente = deps.criarCliente(token, opcoes.maxChamadas ?? MAX_CHAMADAS_POR_CONTA)
    const prazoEsgotado = () => deps.agora() >= opcoes.prazo

    let falhaRenovacao = false
    if (precisaRenovarToken(conexao.tokenExpiraEm, agora)) {
      try {
        const novo = await cliente.renovarToken()
        await repo.salvarTokenRenovado(empresaId, syncToken, novo.accessToken, new Date(deps.agora() + novo.expiresIn * 1000))
        cliente.trocarToken(novo.accessToken)
      } catch (e) {
        if (erroFatalDaConta(e)) throw e
        falhaRenovacao = true
      }
    }

    await repo.atualizarPerfil(empresaId, syncToken, await cliente.perfil())

    // Descoberta: a primeira sincronização lista todo o histórico; as seguintes
    // param ao passar do início da janela, lendo sempre ao menos 2 páginas.
    const primeira = conexao.ultimaSync === null
    const desde = inicioJanela(agora, primeira)
    let after: string | null = null
    let paginas = 0
    do {
      if (prazoEsgotado()) throw new Interrompida()
      const pagina = await cliente.paginaMidias(after)
      await repo.salvarMidiasBase(empresaId, pagina.itens)
      resultado.postsListados += pagina.itens.length
      paginas += 1
      after = pagina.proximo
      const maisAntigo = menorData(pagina.itens)
      if (!primeira && paginas >= MIN_PAGINAS && maisAntigo !== null && maisAntigo < desde) break
    } while (after && paginas < MAX_PAGINAS)

    // Métricas: primeiro a janela (mais desatualizados antes), depois até 100
    // posts antigos ainda sem métricas — é isso que retoma contas grandes.
    const daJanela = await repo.listarAlvosJanela(empresaId, new Date(desde))
    const antigos = await repo.listarPendentesAntigos(empresaId, new Date(desde), LIMITE_PENDENTES_POR_EXECUCAO)
    const alvos = [...daJanela, ...antigos]
    let processados = 0

    try {
      for (let i = 0; i < alvos.length; i += TAMANHO_LOTE) {
        if (prazoEsgotado()) throw new Interrompida()
        if (cliente.proximoDoLimite()) throw new ErroMeta("limite", "uso_alto")
        const lote = alvos.slice(i, i + TAMANHO_LOTE)
        const c = cliente
        const respostas = await Promise.allSettled(lote.map((a) => c.insights(a.id, a.tipo)))
        const salvar: MetricasDoPost[] = []
        let fatal: unknown = null
        respostas.forEach((r, idx) => {
          if (r.status === "fulfilled") salvar.push({ id: lote[idx].id, ...r.value })
          else fatal ??= r.reason
        })
        await repo.salvarMetricas(empresaId, salvar)
        processados += salvar.length
        resultado.metricasAtualizadas += salvar.filter((s) => s.status === "ok" || s.status === "parcial").length
        if (fatal) throw fatal
      }
    } catch (e) {
      resultado.pendentes = alvos.length - processados
      const janelaConcluida = processados >= daJanela.length
      if (!(janelaConcluida && (e instanceof Interrompida || e instanceof OrcamentoEsgotado))) throw e
    }

    registro = {
      sucesso: true,
      expirado: false,
      erroTemporario: falhaRenovacao,
      erroCodigo: falhaRenovacao ? "renovacao_token" : null,
      erroMensagem: falhaRenovacao ? MSG_RENOVACAO : null,
    }
    resultado.estado = "concluida"
    resultado.mensagem =
      resultado.pendentes > 0
        ? `Instagram sincronizado. ${resultado.pendentes} posts antigos ficam para a próxima execução.`
        : "Instagram sincronizado."
  } catch (e) {
    const falha = classificarFalha(e)
    registro = falha.registro
    resultado.estado = falha.estado
    resultado.mensagem = falha.registro.erroMensagem ?? MENSAGENS_ERRO.permanente
  } finally {
    resultado.chamadas = cliente?.chamadas() ?? 0
    await repo.registrarResultado(empresaId, syncToken, registro).catch(() => {})
    await repo.liberarTrava(empresaId, syncToken).catch(() => {})
    deps.log?.("[instagram-sync] execução finalizada", {
      empresaId,
      origem: opcoes.origem,
      estado: resultado.estado,
      codigo: registro.erroCodigo,
      chamadas: resultado.chamadas,
      postsListados: resultado.postsListados,
      metricasAtualizadas: resultado.metricasAtualizadas,
      pendentes: resultado.pendentes,
    })
  }

  return resultado
}
