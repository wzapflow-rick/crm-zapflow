import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assinarState, verificarState } from "@/lib/instagram-api"

describe("state do OAuth do Instagram", () => {
  beforeEach(() => {
    process.env.INSTAGRAM_TOKEN_SECRET = "segredo-de-teste"
  })
  afterEach(() => {
    vi.useRealTimers()
    delete process.env.INSTAGRAM_TOKEN_SECRET
  })

  it("um state assinado devolve o cliente de origem", () => {
    expect(verificarState(assinarState("cliente-a"))).toBe("cliente-a")
  })

  it("trocar o cliente dentro do state invalida a assinatura", () => {
    const state = assinarState("cliente-a")
    const adulterado = state.replace("cliente-a", "cliente-b")
    expect(adulterado).not.toBe(state)
    expect(verificarState(adulterado)).toBeNull()
  })

  it("state com mais de 15 minutos expira", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"))
    const state = assinarState("cliente-a")
    vi.setSystemTime(new Date("2026-01-01T10:16:00Z"))
    expect(verificarState(state)).toBeNull()
  })

  it("sem segredo configurado nenhum state é aceito", () => {
    const state = assinarState("cliente-a")
    delete process.env.INSTAGRAM_TOKEN_SECRET
    delete process.env.INSTAGRAM_APP_SECRET
    expect(verificarState(state)).toBeNull()
  })

  it("lixo e strings vazias são recusados", () => {
    expect(verificarState("")).toBeNull()
    expect(verificarState("abc")).toBeNull()
    expect(verificarState("a.b.c.d")).toBeNull()
  })
})
