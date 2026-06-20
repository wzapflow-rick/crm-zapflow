import "server-only"
import { cookies } from "next/headers"
import crypto from "node:crypto"
import { isDbConfigured, queryOne } from "@/lib/db"
import { membros as membrosMock, type Membro, type Papel } from "@/lib/zapflow-data"

// ---------------------------------------------------------------------------
// Sessão do CRM — cookie httpOnly assinado por HMAC (sem dependências externas).
// O payload guarda só o necessário para montar o usuário logado.
// ---------------------------------------------------------------------------

const COOKIE = "crm_sessao"
const MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

export type Sessao = {
  id: string
  empresaId: string
  nome: string
  papel: Papel
  email: string
}

function secret(): string {
  // Em produção exigimos o segredo; no preview usamos um fallback fixo,
  // já que a sessão ali é só para a demonstração de papéis.
  return process.env.CRM_SESSION_SECRET ?? "preview-crm-dev-secret-nao-use-em-producao"
}

function assinar(dados: string): string {
  return crypto.createHmac("sha256", secret()).update(dados).digest("base64url")
}

function serializar(sessao: Sessao): string {
  const corpo = Buffer.from(JSON.stringify(sessao)).toString("base64url")
  return `${corpo}.${assinar(corpo)}`
}

function desserializar(token: string): Sessao | null {
  const [corpo, assinatura] = token.split(".")
  if (!corpo || !assinatura) return null
  // Comparação em tempo constante para evitar timing attacks.
  const esperada = assinar(corpo)
  const a = Buffer.from(assinatura)
  const b = Buffer.from(esperada)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(corpo, "base64url").toString()) as Sessao
  } catch {
    return null
  }
}

export async function criarSessao(sessao: Sessao): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE, serializar(sessao), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function destruirSessao(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function getSessao(): Promise<Sessao | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  return desserializar(token)
}

// ---------------------------------------------------------------------------
// Verificação de credenciais via pgcrypto (crypt()).
// Retorna a sessão pronta se e-mail + senha conferem e o membro está ativo.
// ---------------------------------------------------------------------------
export async function verificarCredenciais(
  email: string,
  senha: string,
): Promise<Sessao | null> {
  if (!isDbConfigured) return null
  try {
    const row = await queryOne<{
      id: string
      empresa_id: string
      nome: string
      papel: Papel
      email: string
    }>(
      `SELECT id, empresa_id, nome, papel, email
       FROM membros
       WHERE lower(email) = lower($1)
         AND status = 'ativo'
         AND senha_hash IS NOT NULL
         AND senha_hash = crypt($2, senha_hash)
       LIMIT 1`,
      [email.trim(), senha],
    )
    if (!row) return null
    return {
      id: row.id,
      empresaId: row.empresa_id,
      nome: row.nome,
      papel: row.papel,
      email: row.email,
    }
  } catch (err) {
    console.log(
      "[v0] CRM: falha ao verificar credenciais:",
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

// ---------------------------------------------------------------------------
// Usuário de demonstração (preview / fora de produção).
// ---------------------------------------------------------------------------
export function membroDemo(papel: Papel): Membro {
  const m = membrosMock.find((x) => x.papel === papel) ?? membrosMock[0]
  return m
}

export function sessaoDemo(papel: Papel): Sessao {
  const m = membroDemo(papel)
  return { id: m.id, empresaId: "demo", nome: m.nome, papel: m.papel, email: m.email }
}

// Demonstração liberada quando NÃO estamos em produção OU o banco não está configurado.
export const demoLiberada = process.env.NODE_ENV !== "production" || !isDbConfigured
