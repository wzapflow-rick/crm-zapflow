import { describe, expect, it } from "vitest"
import { classificarErroMeta, criarClienteGraph, ErroMeta } from "@/lib/instagram-graph"

const TOKEN = "TOKEN-SECRETO-META-123"

function resposta(status: number, corpo: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(corpo), { status, headers })
}

function cliente(fila: (Response | Error)[], maxChamadas = 50) {
  const urls: string[] = []
  const c = criarClienteGraph({
    token: TOKEN,
    maxChamadas,
    esperar: async () => {},
    fetchImpl: (async (url: URL | string) => {
      urls.push(String(url))
      const proxima = fila.shift()
      if (!proxima) throw new Error("fila vazia")
      if (proxima instanceof Error) throw proxima
      return proxima
    }) as typeof fetch,
  })
  return { c, urls }
}

describe("cliente da Graph API", () => {
  it("métrica sem valor ou não retornada fica vazia, não zero", async () => {
    const { c } = cliente([
      resposta(200, { data: [{ name: "reach", values: [{ value: 120 }] }, { name: "saved", values: [{}] }] }),
      resposta(200, { data: [] }),
    ])
    const r = await c.insights("1", "IMAGE")
    expect(r.status).toBe("ok")
    expect(r.valores.alcance).toBe(120)
    expect(r.valores.salvamentos).toBeNull()
    expect(r.valores.compartilhamentos).toBeNull()
    expect(r.valores.visitasPerfil).toBeNull()
  })

  it("erro de rede tem no máximo 2 novas tentativas", async () => {
    const { c, urls } = cliente([new Error("rede"), new Error("rede"), new Error("rede"), new Error("rede")])
    await expect(c.perfil()).rejects.toBeInstanceOf(ErroMeta)
    expect(urls).toHaveLength(3)
  })

  it("limite de chamadas não tem nova tentativa", async () => {
    const { c, urls } = cliente([resposta(400, { error: { code: 4 } }), resposta(200, {})])
    await expect(c.perfil()).rejects.toMatchObject({ tipo: "limite" })
    expect(urls).toHaveLength(1)
  })

  it("código 190 é reconectar e interrompe as métricas do post", async () => {
    const { c } = cliente([resposta(400, { error: { code: 190 } })])
    await expect(c.insights("1", "IMAGE")).rejects.toMatchObject({ tipo: "reconectar" })
  })

  it("paginação usa só o cursor e não reaproveita o link da Meta", async () => {
    const { c, urls } = cliente([
      resposta(200, {
        data: [{ id: "1", timestamp: "2026-10-20T00:00:00Z" }],
        paging: { next: `https://graph.instagram.com/x?access_token=${TOKEN}&after=ABC`, cursors: { after: "ABC" } },
      }),
      resposta(200, { data: [] }),
    ])
    const p1 = await c.paginaMidias(null)
    expect(p1.proximo).toBe("ABC")
    await c.paginaMidias(p1.proximo)
    expect(new URL(urls[1]).searchParams.get("after")).toBe("ABC")
  })

  it("mensagens de erro nunca contêm o token", async () => {
    const { c } = cliente([resposta(400, { error: { code: 100, message: `token ${TOKEN} inválido` } })])
    const e = await c.perfil().catch((x) => x)
    expect(String(e.message)).not.toContain(TOKEN)
    expect(JSON.stringify(e)).not.toContain(TOKEN)
  })

  it("aviso de uso alto no cabeçalho é detectado", async () => {
    const { c } = cliente([
      resposta(200, {}, { "x-business-use-case-usage": JSON.stringify({ "1": [{ call_count: 95 }] }) }),
    ])
    await c.perfil()
    expect(c.proximoDoLimite()).toBe(true)
  })

  it("classifica erros da Meta", () => {
    expect(classificarErroMeta(400, { code: 190 }).tipo).toBe("reconectar")
    expect(classificarErroMeta(400, { code: 613 }).tipo).toBe("limite")
    expect(classificarErroMeta(500, null).tipo).toBe("temporario")
    expect(classificarErroMeta(400, { code: 100, is_transient: true }).tipo).toBe("temporario")
    expect(classificarErroMeta(400, { code: 100 }).tipo).toBe("permanente")
  })
})
