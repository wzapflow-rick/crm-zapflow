import { afterEach, describe, expect, it } from "vitest"
import {
  cronAutorizado,
  limparFalhas,
  registrarFalha,
  segredoIgual,
  tentativasBloqueadas,
  tokenPortalValido,
} from "@/lib/seguranca"

describe("segredoIgual", () => {
  it("aceita segredos iguais e recusa diferentes ou vazios", () => {
    expect(segredoIgual("abc123", "abc123")).toBe(true)
    expect(segredoIgual("abc123", "abc124")).toBe(false)
    expect(segredoIgual("", "")).toBe(false)
    expect(segredoIgual(null, "x")).toBe(false)
    expect(segredoIgual("x", undefined)).toBe(false)
  })
})

describe("cronAutorizado (rotas agendadas)", () => {
  const original = process.env.CRON_SECRET
  afterEach(() => {
    process.env.CRON_SECRET = original
  })

  it("aceita o Vercel Cron com Bearer correto", () => {
    process.env.CRON_SECRET = "segredo-de-teste"
    const req = new Request("https://app.test/api/cron/x", { headers: { authorization: "Bearer segredo-de-teste" } })
    expect(cronAutorizado(req)).toBe(true)
  })

  it("aceita a chamada manual com ?key= correto", () => {
    process.env.CRON_SECRET = "segredo-de-teste"
    expect(cronAutorizado(new Request("https://app.test/api/cron/x?key=segredo-de-teste"))).toBe(true)
  })

  it("recusa segredo errado, ausente ou quando CRON_SECRET não está configurado", () => {
    process.env.CRON_SECRET = "segredo-de-teste"
    expect(cronAutorizado(new Request("https://app.test/api/cron/x", { headers: { authorization: "Bearer errado" } }))).toBe(false)
    expect(cronAutorizado(new Request("https://app.test/api/cron/x"))).toBe(false)
    delete process.env.CRON_SECRET
    expect(cronAutorizado(new Request("https://app.test/api/cron/x?key="))).toBe(false)
  })
})

describe("tokenPortalValido (portal externo)", () => {
  it("aceita tokens no formato gerado pelo sistema", () => {
    expect(tokenPortalValido("8f14e45fceea167a5a36dedd4bea2543")).toBe(true)
    expect(tokenPortalValido("3b1f2c9e-7a4d-4e1b-9c2a-5d6e7f8a9b0c")).toBe(true)
  })

  it("recusa tokens vazios, curtos, gigantes ou com caracteres de injeção", () => {
    expect(tokenPortalValido("")).toBe(false)
    expect(tokenPortalValido("abc")).toBe(false)
    expect(tokenPortalValido("a".repeat(200))).toBe(false)
    expect(tokenPortalValido("' or 1=1 --aaaaaaaaaaaa")).toBe(false)
    expect(tokenPortalValido("../../etc/passwdaaaaaaaa")).toBe(false)
    expect(tokenPortalValido(null)).toBe(false)
  })
})

describe("limite de tentativas do login", () => {
  it("bloqueia após 8 falhas na janela e libera depois dela", () => {
    const chave = "teste-bloqueio"
    const t0 = 1_000_000
    limparFalhas(chave)
    for (let i = 0; i < 7; i++) registrarFalha(chave, t0)
    expect(tentativasBloqueadas(chave, t0)).toBe(false)
    registrarFalha(chave, t0)
    expect(tentativasBloqueadas(chave, t0)).toBe(true)
    expect(tentativasBloqueadas(chave, t0 + 16 * 60 * 1000)).toBe(false)
  })

  it("login correto zera o contador", () => {
    const chave = "teste-limpeza"
    for (let i = 0; i < 8; i++) registrarFalha(chave, 5)
    limparFalhas(chave)
    expect(tentativasBloqueadas(chave, 5)).toBe(false)
  })
})
