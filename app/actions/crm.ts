"use server"

import { revalidatePath } from "next/cache"
import { isDbConfigured, query } from "@/lib/db"
import { getEmpresaAtivaId, getTelefoneConversa } from "@/lib/crm/queries"
import { getSessao } from "@/lib/crm/auth"
import { enviarTexto, evolutionConfigurada } from "@/lib/crm/evolution"
import type { Papel } from "@/lib/zapflow-data"

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
    // Envia pelo WhatsApp (Evolution) quando configurada; guarda o id retornado
    // para casar com o webhook e evitar duplicar a mensagem no inbox.
    let evolutionId: string | null = null
    if (evolutionConfigurada) {
      const telefone = await getTelefoneConversa(empresaId, conversaId)
      if (telefone) {
        const envio = await enviarTexto(telefone, texto)
        if (envio.ok) {
          evolutionId = envio.messageId ?? null
        } else {
          // Não persiste se o WhatsApp recusou — o atendente vê a mensagem
          // sumir no próximo refresh e pode tentar de novo.
          console.log("[v0] CRM: envio Evolution falhou:", envio.erro)
          throw new Error(envio.erro ?? "Falha no envio Evolution")
        }
      }
    }

    await query(
      `INSERT INTO mensagens (empresa_id, conversa_id, autor, membro_id, conteudo, evolution_message_id)
       VALUES ($1, $2, 'atendente', $3, $4, $5)`,
      [empresaId, conversaId, membroId, texto, evolutionId],
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

// Cria um usuário real com senha (hash via pgcrypto). Só admin pode.
// Diferente das demais actions, esta reporta erro de verdade (não é otimista),
// pois o admin precisa confirmar se o usuário foi criado.
export async function criarMembro(input: {
  nome: string
  email: string
  senha: string
  papel: Papel
  telefone?: string
  cargo?: string
}): Promise<Resultado> {
  const nome = input.nome.trim()
  const email = input.email.trim().toLowerCase()
  const senha = input.senha
  const papel: Papel = input.papel === "admin" ? "admin" : "atendente"

  if (!nome || !email || !senha) {
    return { ok: false, erro: "Preencha nome, e-mail e senha." }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, erro: "E-mail inválido." }
  }
  if (senha.length < 6) {
    return { ok: false, erro: "A senha deve ter ao menos 6 caracteres." }
  }

  // Só administradores podem criar usuários.
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== "admin") {
    return { ok: false, erro: "Apenas administradores podem criar usuários." }
  }

  // Preview/demo (sem banco acessível): simula sucesso para a UI.
  if (!isDbConfigured || sessao.empresaId === "demo") {
    return { ok: true }
  }

  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const cores = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]
  const cor = cores[Math.floor(Math.random() * cores.length)]

  try {
    const existente = await query(
      `SELECT 1 FROM membros WHERE empresa_id = $1 AND lower(email) = $2 LIMIT 1`,
      [sessao.empresaId, email],
    )
    if (existente.length > 0) {
      return { ok: false, erro: "Já existe um membro com esse e-mail." }
    }
    await query(
      `INSERT INTO membros
         (empresa_id, nome, email, telefone, cargo, papel, status, iniciais, cor, senha_hash, entrou_em, online)
       VALUES ($1, $2, $3, $4, $5, $6, 'ativo', $7, $8, crypt($9, gen_salt('bf')), CURRENT_DATE, false)`,
      [
        sessao.empresaId,
        nome,
        email,
        input.telefone?.trim() || null,
        input.cargo?.trim() || null,
        papel,
        iniciais,
        cor,
        senha,
      ],
    )
    revalidatePath("/configuracoes")
    revalidatePath("/equipe")
    return { ok: true }
  } catch (err) {
    console.log(
      "[v0] CRM: falha ao criar membro:",
      err instanceof Error ? err.message : err,
    )
    return { ok: false, erro: "Não foi possível criar o usuário. Tente novamente." }
  }
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
