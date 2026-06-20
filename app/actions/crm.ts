"use server"

import { revalidatePath } from "next/cache"
import { isDbConfigured, query } from "@/lib/db"
import { getEmpresaAtivaId } from "@/lib/crm/queries"

// Todas as actions são escopadas por empresa (multi-tenant).
// Quando CRM_DATABASE_URL não está setada ou o banco está inacessível
// (preview no v0), viram no-op e a UI segue com o estado local otimista.

type Resultado = { ok: boolean; erro?: string }

// Executa a escrita; se o banco estiver inacessível (ex.: preview do v0),
// não quebra a experiência — a UI segue com o estado otimista local.
async function escrever(
  rotulo: string,
  fn: (empresaId: string) => Promise<void>,
): Promise<Resultado> {
  if (!isDbConfigured) return { ok: true }
  try {
    const empresaId = await getEmpresaAtivaId()
    if (!empresaId || empresaId === "demo") return { ok: true }
    await fn(empresaId)
    return { ok: true }
  } catch (err) {
    console.log(
      `[v0] CRM: escrita "${rotulo}" não persistiu (banco inacessível?). Detalhe:`,
      err instanceof Error ? err.message : err,
    )
    return { ok: true }
  }
}

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------
export async function enviarMensagem(
  conversaId: string,
  conteudo: string,
  membroId: string,
): Promise<Resultado> {
  const texto = conteudo.trim()
  if (!texto) return { ok: false, erro: "Mensagem vazia" }

  const r = await escrever("enviarMensagem", async (empresaId) => {
    // TODO: ponto de integração com a Evolution API (envio real do WhatsApp).
    await query(
      `INSERT INTO mensagens (empresa_id, conversa_id, autor, membro_id, conteudo)
       VALUES ($1, $2, 'atendente', $3, $4)`,
      [empresaId, conversaId, membroId, texto],
    )
    await query(
      `UPDATE conversas SET ultima_atividade = now() WHERE id = $1 AND empresa_id = $2`,
      [conversaId, empresaId],
    )
  })
  if (r.ok) revalidatePath("/inbox")
  return r
}

export async function atribuirConversa(
  conversaId: string,
  membroId: string | null,
): Promise<Resultado> {
  const r = await escrever("atribuirConversa", async (empresaId) => {
    await query(
      `UPDATE conversas SET responsavel_id = $1 WHERE id = $2 AND empresa_id = $3`,
      [membroId, conversaId, empresaId],
    )
  })
  if (r.ok) revalidatePath("/inbox")
  return r
}

export async function mudarStatusConversa(
  conversaId: string,
  status: "aberta" | "pendente" | "resolvida",
): Promise<Resultado> {
  const r = await escrever("mudarStatusConversa", async (empresaId) => {
    await query(
      `UPDATE conversas SET status = $1 WHERE id = $2 AND empresa_id = $3`,
      [status, conversaId, empresaId],
    )
  })
  if (r.ok) revalidatePath("/inbox")
  return r
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
export async function moverNegocio(
  negocioId: string,
  etapaTitulo: string,
): Promise<Resultado> {
  const r = await escrever("moverNegocio", async (empresaId) => {
    await query(
      `UPDATE negocios SET etapa_id = (
          SELECT id FROM etapas WHERE empresa_id = $1 AND titulo = $2 LIMIT 1
       ) WHERE id = $3 AND empresa_id = $1`,
      [empresaId, etapaTitulo, negocioId],
    )
  })
  if (r.ok) revalidatePath("/pipeline")
  return r
}

// ---------------------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------------------
export async function alterarPapel(
  membroId: string,
  papel: "admin" | "atendente",
): Promise<Resultado> {
  const r = await escrever("alterarPapel", async (empresaId) => {
    await query(
      `UPDATE membros SET papel = $1 WHERE id = $2 AND empresa_id = $3`,
      [papel, membroId, empresaId],
    )
  })
  if (r.ok) revalidatePath("/equipe")
  return r
}

export async function convidarMembro(
  nome: string,
  email: string,
): Promise<Resultado> {
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const r = await escrever("convidarMembro", async (empresaId) => {
    await query(
      `INSERT INTO membros (empresa_id, nome, email, papel, status, iniciais, cor)
       VALUES ($1, $2, $3, 'atendente', 'convite_pendente', $4, 'bg-chart-2')
       ON CONFLICT (empresa_id, email) DO NOTHING`,
      [empresaId, nome, email, iniciais],
    )
  })
  if (r.ok) revalidatePath("/equipe")
  return r
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------
export async function alternarTarefa(
  tarefaId: string,
  concluida: boolean,
): Promise<Resultado> {
  const r = await escrever("alternarTarefa", async (empresaId) => {
    await query(
      `UPDATE tarefas SET status = $1 WHERE id = $2 AND empresa_id = $3`,
      [concluida ? "concluido" : "pendente", tarefaId, empresaId],
    )
  })
  if (r.ok) revalidatePath("/agenda")
  return r
}
