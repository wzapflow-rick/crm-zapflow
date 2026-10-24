import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { proxy } from "@/proxy"
import { rotaPublica } from "@/lib/rotas-publicas"
import { COOKIE_SESSAO, serializarSessao } from "@/lib/sessao-token"

const USUARIO = { id: "m1", nome: "Ana", iniciais: "AN", cor: "", cargo: "" }

function req(caminho: string, cookie?: string, headers: Record<string, string> = {}) {
  const r = new NextRequest(`https://simple.test${caminho}`, { headers })
  if (cookie) r.cookies.set(COOKIE_SESSAO, cookie)
  return r
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production")
  vi.stubEnv("CRM_SESSION_SECRET", "segredo-de-teste-proxy")
})
afterEach(() => vi.unstubAllEnvs())

describe("rotaPublica", () => {
  it.each([
    "/login",
    "/portal/abcdefghijklmnop1234",
    "/api/portal/abcdefghijklmnop1234/mensagens",
    "/api/cron/resumo-diario",
    "/api/instagram/callback",
    "/api/instagram/data-deletion",
    "/api/instagram/deauthorize",
    "/privacidade",
    "/exclusao-instagram",
  ])("%s é pública", (p) => expect(rotaPublica(p)).toBe(true))

  it.each(["/", "/clientes", "/clientes/1", "/financeiro", "/api/notificacoes", "/api/instagram/connect", "/portaladmin", "/loginx"])(
    "%s é privada",
    (p) => expect(rotaPublica(p)).toBe(false),
  )
})

describe("proxy", () => {
  it("redireciona página privada sem cookie para o login", () => {
    const res = proxy(req("/financeiro"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("https://simple.test/login")
  })

  it("bloqueia requisição RSC de navegação parcial sem cookie", () => {
    const res = proxy(req("/clientes/1", undefined, { RSC: "1", "Next-Router-State-Tree": "%5B%22%22%5D" }))
    expect(res.status).toBe(307)
  })

  it("devolve 401 em API interna sem cookie", async () => {
    const res = proxy(req("/api/notificacoes"))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ erro: "Não autenticado." })
  })

  it("recusa cookie com assinatura forjada", () => {
    const valido = serializarSessao(USUARIO)!
    const [corpo] = valido.split(".")
    const forjado = `${Buffer.from(JSON.stringify({ ...USUARIO, id: "admin", exp: 9e9 })).toString("base64url")}.${valido.split(".")[1]}`
    expect(proxy(req("/", `${corpo}.assinatura-falsa`)).status).toBe(307)
    expect(proxy(req("/", forjado)).status).toBe(307)
  })

  it("recusa cookie expirado", () => {
    const antigo = serializarSessao(USUARIO, Date.now() - 31 * 24 * 60 * 60 * 1000)!
    expect(proxy(req("/", antigo)).status).toBe(307)
  })

  it("recusa cookie assinado com segredo antigo (rotação de CRM_SESSION_SECRET)", () => {
    const antigo = serializarSessao(USUARIO)!
    vi.stubEnv("CRM_SESSION_SECRET", "segredo-novo")
    expect(proxy(req("/", antigo)).status).toBe(307)
  })

  it("deixa passar sessão válida", () => {
    const res = proxy(req("/clientes", serializarSessao(USUARIO)!))
    expect(res.headers.get("x-middleware-next")).toBe("1")
  })

  it("não bloqueia rotas públicas", () => {
    for (const p of ["/login", "/portal/abcdefghijklmnop1234", "/api/cron/resumo-diario"]) {
      expect(proxy(req(p)).headers.get("x-middleware-next"), p).toBe("1")
    }
  })

  it("sem CRM_SESSION_SECRET em produção, nenhum cookie é aceito", () => {
    const valido = serializarSessao(USUARIO)!
    vi.stubEnv("CRM_SESSION_SECRET", "")
    expect(proxy(req("/", valido)).status).toBe(307)
  })
})
