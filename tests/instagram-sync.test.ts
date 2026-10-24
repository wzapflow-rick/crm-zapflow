import { describe, expect, it } from "vitest"
import {
  sincronizarConta,
  precisaRenovarToken,
  type AlvoMetricas,
  type ConexaoSync,
  type DepsSync,
  type MetricasDoPost,
  type RegistroResultado,
  type RepoSync,
} from "@/lib/instagram-sync"
import { executarSyncDiario } from "@/lib/instagram-sync-cron"
import { ErroMeta, type ClienteGraph, type MidiaBase } from "@/lib/instagram-graph"
import { estadoConexao } from "@/lib/instagram-estado"

const DIA = 86_400_000
const AGORA = Date.parse("2026-10-21T12:00:00Z") // quarta-feira
const TOKEN_META = "TOKEN-SECRETO-META-123"

function midia(i: number, diasAtras: number): MidiaBase {
  return {
    id: String(1000 + i),
    tipo: "IMAGE",
    legenda: "",
    permalink: "",
    thumbnailUrl: "",
    mediaUrl: "",
    publicadoEm: new Date(AGORA - diasAtras * DIA).toISOString(),
    curtidas: null,
    comentarios: null,
  }
}

type Estado = {
  conexao: ConexaoSync | null
  trava: { token: string; ate: number } | null
  midias: Map<string, MidiaBase & { status: string | null }>
  metricasSalvas: MetricasDoPost[]
  registros: { token: string; registro: RegistroResultado }[]
  tokenSalvo: string | null
}

function criarRepo(agora: () => number, inicial: Partial<Estado> = {}) {
  const s: Estado = {
    conexao: { modo: "real", status: "conectado", tokenExpiraEm: new Date(AGORA + 40 * DIA), ultimaSync: new Date(AGORA - DIA) },
    trava: null,
    midias: new Map(),
    metricasSalvas: [],
    registros: [],
    tokenSalvo: null,
    ...inicial,
  }
  const repo: RepoSync = {
    obterConexao: async () => s.conexao,
    obterToken: async () => TOKEN_META,
    adquirirTrava: async (_e, token, validade) => {
      if (s.trava && s.trava.ate > agora()) return false
      s.trava = { token, ate: agora() + validade }
      return true
    },
    liberarTrava: async (_e, token) => {
      if (s.trava?.token === token) s.trava = null
    },
    salvarTokenRenovado: async (_e, token, novo) => {
      if (s.trava?.token === token) s.tokenSalvo = novo
    },
    atualizarPerfil: async () => {},
    salvarMidiasBase: async (_e, itens) => {
      for (const m of itens) s.midias.set(m.id, { ...m, status: s.midias.get(m.id)?.status ?? null })
    },
    listarAlvosJanela: async (_e, desde) =>
      [...s.midias.values()]
        .filter((m) => Date.parse(m.publicadoEm ?? "") >= desde.getTime())
        .map((m): AlvoMetricas => ({ id: m.id, tipo: m.tipo })),
    listarPendentesAntigos: async (_e, antes, limite) =>
      [...s.midias.values()]
        .filter((m) => Date.parse(m.publicadoEm ?? "") < antes.getTime() && (m.status === null || m.status === "erro"))
        .slice(0, limite)
        .map((m) => ({ id: m.id, tipo: m.tipo })),
    salvarMetricas: async (_e, resultados) => {
      for (const r of resultados) {
        s.metricasSalvas.push(r)
        const m = s.midias.get(r.id)
        if (m) m.status = r.status
      }
    },
    registrarResultado: async (_e, token, registro) => {
      if (s.trava?.token === token) s.registros.push({ token, registro })
    },
  }
  return { repo, s }
}

type ClienteFalso = Partial<ClienteGraph> & { paginas?: MidiaBase[][] }

function criarCliente(f: ClienteFalso = {}): ClienteGraph & { paginasLidas: () => number } {
  let n = 0
  let lidas = 0
  const paginas = f.paginas ?? [[midia(1, 1), midia(2, 2)]]
  return {
    perfil: f.perfil ?? (async () => ({ igUserId: "1", username: "u", nome: null, accountType: null, profilePictureUrl: null, seguidores: 1, segue: 1, midiaCount: 1 })),
    paginaMidias:
      f.paginaMidias ??
      (async (after) => {
        const i = after ? Number(after) : 0
        lidas += 1
        n += 1
        return { itens: paginas[i] ?? [], proximo: i + 1 < paginas.length ? String(i + 1) : null }
      }),
    insights: f.insights ?? (async () => { n += 2; return { status: "ok", valores: { alcance: 10 } } }),
    renovarToken: f.renovarToken ?? (async () => ({ accessToken: "NOVO", expiresIn: 60 * DIA / 1000 })),
    trocarToken: () => {},
    chamadas: () => n,
    proximoDoLimite: f.proximoDoLimite ?? (() => false),
    paginasLidas: () => lidas,
  }
}

function deps(repo: RepoSync, cliente: ClienteGraph, agora: () => number = () => AGORA): DepsSync & { logs: unknown[] } {
  let id = 0
  const logs: unknown[] = []
  return {
    repo,
    criarCliente: () => cliente,
    gerarId: () => `exec-${++id}`,
    agora,
    log: (evento, dados) => logs.push({ evento, dados }),
    logs,
  }
}

const opcoes = { origem: "cron" as const, prazo: AGORA + 270_000 }

describe("sincronização do Instagram", () => {
  it("falha nas métricas de um post marca erro e os demais continuam", async () => {
    const { repo, s } = criarRepo(() => AGORA)
    const cliente = criarCliente({
      paginas: [[midia(1, 1), midia(2, 2), midia(3, 3)]],
      insights: async (id) => (id === "1002" ? { status: "erro", valores: {} } : { status: "ok", valores: { alcance: 5 } }),
    })
    const r = await sincronizarConta("emp", opcoes, deps(repo, cliente))
    expect(r.estado).toBe("concluida")
    expect(s.midias.get("1002")?.status).toBe("erro")
    expect(s.midias.get("1001")?.status).toBe("ok")
    expect(s.midias.get("1003")?.status).toBe("ok")
  })

  it("paginação para ao passar da janela, lê ao menos 2 páginas e não duplica posts", async () => {
    const { repo, s } = criarRepo(() => AGORA)
    const cliente = criarCliente({
      paginas: [[midia(1, 1), midia(2, 200)], [midia(2, 200), midia(3, 210)], [midia(4, 300)]],
    })
    await sincronizarConta("emp", opcoes, deps(repo, cliente))
    expect(cliente.paginasLidas()).toBe(2)
    expect(s.midias.size).toBe(3)
  })

  it("timeout no meio preserva os lotes já gravados", async () => {
    let agora = AGORA
    const { repo, s } = criarRepo(() => agora)
    const itens = Array.from({ length: 20 }, (_, i) => midia(i, 1))
    const cliente = criarCliente({
      paginas: [itens],
      insights: async () => {
        agora += 50_000
        return { status: "ok", valores: { alcance: 1 } }
      },
    })
    const r = await sincronizarConta("emp", { origem: "manual", prazo: AGORA + 270_000 }, deps(repo, cliente, () => agora))
    expect(r.estado).toBe("parcial")
    expect(s.metricasSalvas.length).toBe(6)
    expect(s.registros.at(-1)?.registro.erroCodigo).toBe("tempo_esgotado")
    expect(s.trava).toBeNull()
  })

  it("segunda execução é recusada enquanto a trava vale", async () => {
    const { repo, s } = criarRepo(() => AGORA, { trava: { token: "outra", ate: AGORA + 60_000 } })
    const r = await sincronizarConta("emp", opcoes, deps(repo, criarCliente()))
    expect(r.estado).toBe("bloqueada")
    expect(s.trava?.token).toBe("outra")
  })

  it("trava vencida é retomada", async () => {
    const { repo } = criarRepo(() => AGORA, { trava: { token: "antiga", ate: AGORA - 1 } })
    const r = await sincronizarConta("emp", opcoes, deps(repo, criarCliente()))
    expect(r.estado).toBe("concluida")
  })

  it("execução antiga não libera a trava nova nem grava o status", async () => {
    let agora = AGORA
    const { repo, s } = criarRepo(() => agora)
    const cliente = criarCliente({
      insights: async () => {
        // a trava expira e outra execução pega a conta no meio desta
        agora += 11 * 60_000
        s.trava = { token: "nova", ate: agora + 600_000 }
        return { status: "ok", valores: {} }
      },
    })
    await sincronizarConta("emp", { origem: "cron", prazo: AGORA + 3_600_000 }, deps(repo, cliente, () => agora))
    expect(s.trava?.token).toBe("nova")
    expect(s.registros).toHaveLength(0)
  })

  it("código 190 leva a precisa reconectar e para a conta", async () => {
    const { repo, s } = criarRepo(() => AGORA)
    let insights = 0
    const cliente = criarCliente({
      perfil: async () => { throw new ErroMeta("reconectar", "meta_190") },
      insights: async () => { insights += 1; return { status: "ok", valores: {} } },
    })
    const r = await sincronizarConta("emp", opcoes, deps(repo, cliente))
    expect(r.estado).toBe("precisa_reconectar")
    expect(s.registros.at(-1)?.registro.expirado).toBe(true)
    expect(insights).toBe(0)
  })

  it("aviso de limite para só a conta, sem apagar métricas", async () => {
    const { repo, s } = criarRepo(() => AGORA)
    const cliente = criarCliente({ insights: async () => { throw new ErroMeta("limite", "meta_4") } })
    const r = await sincronizarConta("emp", opcoes, deps(repo, cliente))
    expect(r.estado).toBe("limite")
    expect(s.metricasSalvas).toHaveLength(0)
    expect(s.registros.at(-1)?.registro.erroTemporario).toBe(true)
  })

  it("renovação do token só com 15 dias ou menos e token com mais de 24 h", () => {
    expect(precisaRenovarToken(new Date(AGORA + 40 * DIA), AGORA)).toBe(false)
    expect(precisaRenovarToken(new Date(AGORA + 10 * DIA), AGORA)).toBe(true)
    expect(precisaRenovarToken(new Date(AGORA + 60 * DIA - 3_600_000), AGORA)).toBe(false)
    expect(precisaRenovarToken(new Date(AGORA - 1), AGORA)).toBe(false)
  })

  it("falha na renovação fica registrada e a coleta continua", async () => {
    const { repo, s } = criarRepo(() => AGORA)
    s.conexao!.tokenExpiraEm = new Date(AGORA + 5 * DIA)
    const cliente = criarCliente({ renovarToken: async () => { throw new ErroMeta("temporario", "http_500") } })
    const r = await sincronizarConta("emp", opcoes, deps(repo, cliente))
    expect(r.estado).toBe("concluida")
    expect(s.registros.at(-1)?.registro.erroCodigo).toBe("renovacao_token")
  })

  it("renovação bem-sucedida grava o novo token", async () => {
    const { repo, s } = criarRepo(() => AGORA)
    s.conexao!.tokenExpiraEm = new Date(AGORA + 5 * DIA)
    await sincronizarConta("emp", opcoes, deps(repo, criarCliente()))
    expect(s.tokenSalvo).toBe("NOVO")
  })

  it("contas de demonstração ficam fora da sincronização", async () => {
    const { repo } = criarRepo(() => AGORA, {
      conexao: { modo: "demo", status: "conectado", tokenExpiraEm: null, ultimaSync: null },
    })
    const r = await sincronizarConta("emp", opcoes, deps(repo, criarCliente()))
    expect(r.estado).toBe("ignorada")
  })

  it("nenhum log ou registro gravado contém o token", async () => {
    const { repo, s } = criarRepo(() => AGORA)
    const cliente = criarCliente({ perfil: async () => { throw new Error(`falhou com ${TOKEN_META}`) } })
    const d = deps(repo, cliente)
    await sincronizarConta("emp", opcoes, d)
    expect(JSON.stringify(d.logs)).not.toContain(TOKEN_META)
    expect(JSON.stringify(s.registros)).not.toContain(TOKEN_META)
  })
})

describe("rotina diária", () => {
  it("uma conta com erro não impede as outras", async () => {
    const vistas: string[] = []
    const r = await executarSyncDiario({
      listarContas: async () => ["a", "b", "c"],
      sincronizar: async (id) => {
        vistas.push(id)
        if (id === "b") throw new Error("boom")
        return { empresaId: id, estado: "concluida", mensagem: "", postsListados: 0, metricasAtualizadas: 0, pendentes: 0, chamadas: 1 }
      },
      agora: () => AGORA,
    })
    expect(vistas).toEqual(["a", "b", "c"])
    expect(r.resultados.map((x) => x.estado)).toEqual(["concluida", "erro", "concluida"])
  })

  it("não inicia contas novas depois de 240 s", async () => {
    let agora = AGORA
    const r = await executarSyncDiario({
      listarContas: async () => ["a", "b", "c"],
      sincronizar: async (id) => {
        agora += 150_000
        return { empresaId: id, estado: "concluida", mensagem: "", postsListados: 0, metricasAtualizadas: 0, pendentes: 0, chamadas: 1 }
      },
      agora: () => agora,
    })
    expect(r.processadas).toBe(2)
    expect(r.naoIniciadas).toBe(1)
  })
})

describe("estado da conexão", () => {
  const base = {
    modo: "real" as const,
    status: "conectado" as const,
    tokenExpiraEm: new Date(AGORA + 30 * DIA).toISOString(),
    ultimaSync: new Date(AGORA - DIA).toISOString(),
    syncBloqueadaAte: null,
    erroTemporario: false,
  }
  it("classifica os estados", () => {
    expect(estadoConexao(base, AGORA)).toBe("sincronizada")
    expect(estadoConexao({ ...base, ultimaSync: new Date(AGORA - 37 * 3_600_000).toISOString() }, AGORA)).toBe("atrasada")
    expect(estadoConexao({ ...base, erroTemporario: true }, AGORA)).toBe("erro_temporario")
    expect(estadoConexao({ ...base, status: "expirado" }, AGORA)).toBe("precisa_reconectar")
    expect(estadoConexao({ ...base, tokenExpiraEm: new Date(AGORA - 1).toISOString() }, AGORA)).toBe("precisa_reconectar")
    expect(estadoConexao({ ...base, modo: "demo" }, AGORA)).toBe("demo")
  })
})
