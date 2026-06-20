"use server"

import { revalidatePath } from "next/cache"
import { isDbConfigured, query } from "@/lib/db"
import { getEmpresaAtivaId } from "@/lib/crm/queries"

// Todas as actions são escopadas por empresa (multi-tenant).
// Quando CRM_DATABASE_URL não está setada (preview no v0), viram no-op e a UI
// segue com o estado local otimista.

type Resultado = { ok: boolean; erro?: string }

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------
export async function enviarMensagem(
  conversaId: string,
  conteudo: string,
  membroId: string,
): Promise<Resultado> {
  if (!isDbConfigured) return { ok: true }
  const texto = conteudo.trim()
  if (!texto) return { ok: false, erro: "Mensagem vazia" }

  const empresaId = await getEmpresaAtivaId()
  if (!empresaId) return { ok: false, erro: "Empresa não encontrada" }

  // TODO: aqui é o ponto de integração com a Evolution API (envio real).
  await query(
    `INSERT INTO mensagens (empresa_id, conversa_id, autor, membro_id, conteudo)
     VALUES ($1, $2, 'atendente', $3, $4)`,
    [empresaId, conversaId, membroId, texto],
  )
  await query(
    `UPDATE conversas SET ultima_atividade = now() WHERE id = $1 AND empresa_id = $2`,
    [conversaId, empresaId],
  )
  revalidatePath("/inbox")
  return { ok: true }
}

export async function atribuirConversa(
  conversaId: string,
  membroId: string | null,
): Promise<Resultado> {
  if (!isDbConfigured) return { ok: true }
  const empresaId = await getEmpresaAtivaId()
  if (!empresaId) return { ok: false, erro: "Empresa não encontrada" }

  await query(
    `UPDATE conversas SET responsavel_id = $1 WHERE id = $2 AND empresa_id = $3`,
    [membroId, conversaId, empresaId],
  )
  revalidatePath("/inbox")
  return { ok: true }
}

export async function mudarStatusConversa(
  conversaId: string,
  status: "aberta" | "pendente" | "resolvida",
): Promise<Resultado> {
  if (!isDbConfigured) return { ok: true }
  const empresaId = await getEmpresaAtivaId()
  if (!empresaId) return { ok: false, erro: "Empresa não encontrada" }

  await query(
    `UPDATE conversas SET status = $1 WHERE id = $2 AND empresa_id = $3`,
    [status, conversaId, empresaId],
  )
  revalidatePath("/inbox")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
export async function moverNegocio(
  negocioId: string,
  etapaTitulo: string,
): Promise<Resultado> {
  if (!isDbConfigured) return { ok: true }
  const empresaId = await getEmpresaAtivaId()
  if (!empresaId) return { ok: false, erro: "Empresa não encontrada" }

  await query(
    `UPDATE negocios SET etapa_id = (
        SELECT id FROM etapas WHERE empresa_id = $1 AND titulo = $2 LIMIT 1
     ) WHERE id = $3 AND empresa_id = $1`,
    [empresaId, etapaTitulo, negocioId],
  )
  revalidatePath("/pipeline")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------------------
export async function alterarPapel(
  membroId: string,
  papel: "admin" | "atendente",
): Promise<Resultado> {
  if (!isDbConfigured) return { ok: true }
  const empresaId = await getEmpresaAtivaId()
  if (!empresaId) return { ok: false, erro: "Empresa não encontrada" }

  await query(
    `UPDATE membros SET papel = $1 WHERE id = $2 AND empresa_id = $3`,
    [papel, membroId, empresaId],
  )
  revalidatePath("/equipe")
  return { ok: true }
}

export async function convidarMembro(
  nome: string,
  email: string,
): Promise<Resultado> {
  if (!isDbConfigured) return { ok: true }
  const empresaId = await getEmpresaAtivaId()
  if (!empresaId) return { ok: false, erro: "Empresa não encontrada" }

  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  await query(
    `INSERT INTO membros (empresa_id, nome, email, papel, status, iniciais, cor)
     VALUES ($1, $2, $3, 'atendente', 'convite_pendente', $4, 'bg-chart-2')
     ON CONFLICT (empresa_id, email) DO NOTHING`,
    [empresaId, nome, email, iniciais],
  )
  revalidatePath("/equipe")
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------
export async function alternarTarefa(
  tarefaId: string,
  concluida: boolean,
): Promise<Resultado> {
  if (!isDbConfigured) return { ok: true }
  const empresaId = await getEmpresaAtivaId()
  if (!empresaId) return { ok: false, erro: "Empresa não encontrada" }

  await query(
    `UPDATE tarefas SET status = $1 WHERE id = $2 AND empresa_id = $3`,
    [concluida ? "concluido" : "pendente", tarefaId, empresaId],
  )
  revalidatePath("/agenda")
  return { ok: true }
}
