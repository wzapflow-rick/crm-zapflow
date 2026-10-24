import { beforeEach, describe, expect, it, vi } from "vitest"

// Banco simulado: dois clientes, cada um com seu token e seus conteúdos.
const CLIENTES = {
  tokenClienteAaaaaaaaaa: { id: "empresa-a", nome: "Cliente A" },
  tokenClienteBbbbbbbbbb: { id: "empresa-b", nome: "Cliente B" },
} as const
const CONTEUDOS: Record<string, { id: string; titulo: string }[]> = {
  "empresa-a": [{ id: "conteudo-a1", titulo: "Reels A" }],
  "empresa-b": [{ id: "conteudo-b1", titulo: "Reels B" }],
}

const db = vi.hoisted(() => ({
  getClientePorToken: vi.fn(),
  getConteudos: vi.fn(),
  atualizarStatusConteudo: vi.fn(),
  adicionarMensagemCliente: vi.fn(),
  adicionarEnvio: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/clientes-db", () => ({
  getClientePorToken: db.getClientePorToken,
  getConteudos: db.getConteudos,
  atualizarStatusConteudo: db.atualizarStatusConteudo,
  adicionarMensagemCliente: db.adicionarMensagemCliente,
}))
vi.mock("@/lib/envios-db", () => ({
  adicionarEnvio: db.adicionarEnvio,
  normalizarLink: (l: string) => (l.startsWith("https://") ? l : null),
}))

import {
  aprovarConteudoPortalAction,
  enviarMaterialPortalAction,
  enviarMensagemPortalAction,
} from "@/app/portal/[token]/actions"

function form(campos: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}
const inicial = { ok: false }

beforeEach(() => {
  vi.clearAllMocks()
  db.getClientePorToken.mockImplementation(async (t: string) => CLIENTES[t as keyof typeof CLIENTES] ?? null)
  db.getConteudos.mockImplementation(async (id: string) => CONTEUDOS[id] ?? [])
})

describe("portal · aprovação", () => {
  it("cliente A não consegue aprovar conteúdo do cliente B", async () => {
    const r = await aprovarConteudoPortalAction(
      inicial,
      form({ token: "tokenClienteAaaaaaaaaa", conteudoId: "conteudo-b1", decisao: "aprovado" }),
    )
    expect(r).toEqual({ ok: false, erro: "Conteúdo não encontrado." })
    expect(db.atualizarStatusConteudo).not.toHaveBeenCalled()
    expect(db.adicionarMensagemCliente).not.toHaveBeenCalled()
  })

  it("aprovação legítima grava só no cliente dono do token", async () => {
    const r = await aprovarConteudoPortalAction(
      inicial,
      form({ token: "tokenClienteAaaaaaaaaa", conteudoId: "conteudo-a1", decisao: "aprovado" }),
    )
    expect(r.ok).toBe(true)
    expect(db.atualizarStatusConteudo).toHaveBeenCalledWith("empresa-a", "conteudo-a1", "aprovado")
  })

  it("token inexistente ou expirado não chega a ler conteúdos", async () => {
    const r = await aprovarConteudoPortalAction(
      inicial,
      form({ token: "tokenQueNaoExiste12345", conteudoId: "conteudo-a1", decisao: "aprovado" }),
    )
    expect(r.ok).toBe(false)
    expect(db.getConteudos).not.toHaveBeenCalled()
  })

  it("decisão fora da lista é recusada", async () => {
    const r = await aprovarConteudoPortalAction(
      inicial,
      form({ token: "tokenClienteAaaaaaaaaa", conteudoId: "conteudo-a1", decisao: "publicado" }),
    )
    expect(r.ok).toBe(false)
    expect(db.atualizarStatusConteudo).not.toHaveBeenCalled()
  })

  it("falha do banco não expõe detalhes internos", async () => {
    db.getClientePorToken.mockRejectedValueOnce(new Error('relation "empresas" does not exist'))
    const r = await aprovarConteudoPortalAction(
      inicial,
      form({ token: "tokenClienteAaaaaaaaaa", conteudoId: "conteudo-a1", decisao: "aprovado" }),
    )
    expect(r.ok).toBe(false)
    expect(r.erro).not.toMatch(/relation|empresas/)
  })
})

describe("portal · mensagens e materiais", () => {
  it("mensagem vai para o cliente do token, não para um id enviado no formulário", async () => {
    await enviarMensagemPortalAction(
      inicial,
      form({ token: "tokenClienteAaaaaaaaaa", texto: "Oi", empresaId: "empresa-b", clienteId: "empresa-b" }),
    )
    expect(db.adicionarMensagemCliente).toHaveBeenCalledWith("empresa-a", "Oi", "Cliente A")
  })

  it("material vai para o cliente do token", async () => {
    await enviarMaterialPortalAction(
      inicial,
      form({ token: "tokenClienteBbbbbbbbbb", link: "https://drive.test/x", empresaId: "empresa-a" }),
    )
    expect(db.adicionarEnvio.mock.calls[0][0]).toBe("empresa-b")
  })

  it("textos gigantes são recusados antes do banco", async () => {
    const r = await enviarMensagemPortalAction(
      inicial,
      form({ token: "tokenClienteAaaaaaaaaa", texto: "x".repeat(5000) }),
    )
    expect(r.ok).toBe(false)
    expect(db.getClientePorToken).not.toHaveBeenCalled()
  })
})
