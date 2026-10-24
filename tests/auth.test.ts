import { beforeEach, describe, expect, it, vi } from "vitest"
import { AcessoNegadoError, exigirAdmin, exigirUsuario, exigirUsuarioApi, usuarioAutenticado } from "@/lib/auth"

const { getUsuarioAtual, getMembroPorId } = vi.hoisted(() => ({
  getUsuarioAtual: vi.fn(),
  getMembroPorId: vi.fn(),
}))

vi.mock("@/lib/sessao", () => ({ getUsuarioAtual: () => getUsuarioAtual() }))
vi.mock("@/lib/membros-db", () => ({ getMembroPorId: (id: string) => getMembroPorId(id) }))
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
}))


const ADMIN = { id: "admin", nome: "Admin" }
const MEMBRO = { id: "membro-1", nome: "Ana" }

beforeEach(() => {
  getUsuarioAtual.mockReset()
  getMembroPorId.mockReset()
})

describe("usuário não autenticado", () => {
  it("Server Action privada redireciona para o login", async () => {
    getUsuarioAtual.mockResolvedValue(null)
    await expect(exigirUsuario()).rejects.toThrow("REDIRECT:/login")
  })

  it("rota de API interna responde 401 sem vazar dados", async () => {
    getUsuarioAtual.mockResolvedValue(null)
    const resposta = await exigirUsuarioApi()
    expect(resposta).toBeInstanceOf(Response)
    expect((resposta as Response).status).toBe(401)
    expect(await (resposta as Response).json()).toEqual({ erro: "Não autenticado." })
  })
})

describe("sessão de membro", () => {
  it("membro ativo acessa operações internas", async () => {
    getUsuarioAtual.mockResolvedValue(MEMBRO)
    getMembroPorId.mockResolvedValue({ id: MEMBRO.id })
    await expect(exigirUsuario()).resolves.toEqual(MEMBRO)
  })

  it("membro removido da equipe perde o acesso mesmo com cookie válido", async () => {
    getUsuarioAtual.mockResolvedValue(MEMBRO)
    getMembroPorId.mockResolvedValue(null)
    await expect(usuarioAutenticado()).resolves.toBeNull()
    await expect(exigirUsuario()).rejects.toThrow("REDIRECT:/login")
  })

  it("falha no banco ao checar o membro nega o acesso (fail closed)", async () => {
    getUsuarioAtual.mockResolvedValue(MEMBRO)
    getMembroPorId.mockRejectedValue(new Error("db fora"))
    await expect(usuarioAutenticado()).resolves.toBeNull()
  })

  it("membro sem papel de admin não executa operação administrativa", async () => {
    getUsuarioAtual.mockResolvedValue(MEMBRO)
    getMembroPorId.mockResolvedValue({ id: MEMBRO.id })
    await expect(exigirAdmin()).rejects.toBeInstanceOf(AcessoNegadoError)
  })
})

describe("sessão de admin", () => {
  it("admin executa operação administrativa sem consultar a tabela de membros", async () => {
    getUsuarioAtual.mockResolvedValue(ADMIN)
    await expect(exigirAdmin()).resolves.toEqual(ADMIN)
    expect(getMembroPorId).not.toHaveBeenCalled()
  })
})
