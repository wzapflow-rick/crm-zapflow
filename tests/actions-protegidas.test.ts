import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

const RAIZ = join(__dirname, "..")

// Pontos públicos com autenticação própria (PIN do login, token do portal).
const PUBLICOS = ["app/login/", "app/portal/"]

function arquivosTs(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivosTs(caminho)
    return /\.tsx?$/.test(nome) ? [caminho] : []
  })
}

function funcoesExportadas(fonte: string) {
  const partes = fonte.split(/^(?=export async function )/m).slice(1)
  return partes.map((corpo) => ({
    nome: /export async function (\w+)/.exec(corpo)?.[1] ?? "?",
    protegida: /exigir(Usuario|Admin)\(/.test(corpo),
  }))
}

describe("Server Actions", () => {
  const arquivos = arquivosTs(join(RAIZ, "app"))
    .map((caminho) => ({ caminho: relative(RAIZ, caminho), fonte: readFileSync(caminho, "utf8") }))
    .filter(({ fonte }) => /^["']use server["']/m.test(fonte))

  it("existem actions para verificar", () => {
    expect(arquivos.length).toBeGreaterThan(10)
  })

  it("toda action interna valida a sessão no servidor", () => {
    const desprotegidas = arquivos
      .filter(({ caminho }) => !PUBLICOS.some((p) => caminho.startsWith(p)))
      .flatMap(({ caminho, fonte }) =>
        funcoesExportadas(fonte)
          .filter((f) => !f.protegida)
          .map((f) => `${caminho} → ${f.nome}`),
      )
    expect(desprotegidas).toEqual([])
  })

  it("actions do portal validam o token antes de qualquer acesso", () => {
    const portal = arquivos.find(({ caminho }) => caminho.startsWith("app/portal/"))
    expect(portal).toBeDefined()
    for (const f of funcoesExportadas(portal!.fonte)) {
      const corpo = portal!.fonte.split(`export async function ${f.nome}`)[1]
      expect(corpo, f.nome).toMatch(/getClientePorToken|tokenPortalValido/)
    }
  })
})

describe("Route Handlers internos", () => {
  const internos = [
    "app/api/clientes/[id]/mensagens/route.ts",
    "app/api/notificacoes/route.ts",
    "app/api/upload-logo/route.ts",
    "app/(crm)/marketing/chat/route.ts",
  ]
  it.each(internos)("%s exige usuário autenticado", (caminho) => {
    expect(readFileSync(join(RAIZ, caminho), "utf8")).toMatch(/exigirUsuarioApi\(\)/)
  })

  it.each(["app/api/cron/avisar-pendencias/route.ts", "app/api/cron/resumo-diario/route.ts"])(
    "%s aceita apenas o CRON_SECRET",
    (caminho) => {
      expect(readFileSync(join(RAIZ, caminho), "utf8")).toMatch(/cronAutorizado\(req\)/)
    },
  )
})

describe("segredos no navegador", () => {
  it("nenhum componente cliente lê variáveis sem NEXT_PUBLIC_", () => {
    const vazamentos = arquivosTs(join(RAIZ, "components"))
      .map((caminho) => ({ caminho: relative(RAIZ, caminho), fonte: readFileSync(caminho, "utf8") }))
      .filter(({ fonte }) => /^["']use client["']/m.test(fonte))
      .filter(({ fonte }) => /process\.env\.(?!NEXT_PUBLIC_)\w+/.test(fonte))
      .map(({ caminho }) => caminho)
    expect(vazamentos).toEqual([])
  })
})
