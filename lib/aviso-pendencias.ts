import "server-only"
import { query } from "@/lib/db"
import { enviarTextoWhatsApp } from "@/lib/whatsapp"

// Aviso de conteúdos pendentes de aprovação no portal do cliente.
// "Pendente" = conteúdo com status 'aprovacao' (o card "Aguardando você" no portal).
// A mensagem é enviada no WhatsApp do cliente (número em empresas.telefone) via Evolution API.

export type ClientePendencia = {
  id: string
  nome: string
  telefone: string
  portalToken: string
  pendentes: number
}

export type ResultadoAviso = {
  id: string
  nome: string
  pendentes: number
  ok: boolean
  enviado: boolean
  motivo?: string // razão de não ter enviado (sem telefone, erro da Evolution, etc.)
}

// Monta a URL pública do portal do cliente. Usa PORTAL_BASE_URL (ou NEXT_PUBLIC_APP_URL)
// se definida; senão cai para a URL de produção do próprio projeto na Vercel.
function baseUrlPortal(): string {
  const explicito = process.env.PORTAL_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (explicito) return explicito.replace(/\/+$/, "")
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`
  return ""
}

function urlPortalDe(token: string): string {
  const base = baseUrlPortal()
  if (!base || !token) return ""
  return `${base}/portal/${token}`
}

// Texto amigável do aviso. Inclui o link do portal quando disponível.
export function montarMensagemPendencia(nome: string, pendentes: number, portalUrl: string): string {
  const primeiroNome = nome.trim().split(/\s+/)[0] || nome.trim() || "tudo bem"
  const plural = pendentes > 1
  const linhas: string[] = [
    `Oi, ${primeiroNome}! 💜`,
    ``,
    plural
      ? `Passando para lembrar que você tem *${pendentes} conteúdos* esperando a sua aprovação no portal. 😊`
      : `Passando para lembrar que você tem *1 conteúdo* esperando a sua aprovação no portal. 😊`,
    ``,
    plural
      ? `Quando puder, dá uma olhadinha e aprova eles pra gente seguir com a produção no capricho!`
      : `Quando puder, dá uma olhadinha e aprova pra gente seguir com a produção no capricho!`,
  ]
  if (portalUrl) {
    linhas.push(``, `👉 ${portalUrl}`)
  }
  linhas.push(``, `—`, `_Mensagem automática da SIMPLE_`)
  return linhas.join("\n")
}

// Lista todos os clientes que têm pelo menos um conteúdo aguardando aprovação.
export async function getClientesComPendencias(): Promise<ClientePendencia[]> {
  const rows = await query<{
    id: string
    nome: string
    telefone: string | null
    portal_token: string | null
    pendentes: number
  }>(
    `select e.id,
            e.nome,
            e.telefone,
            e.portal_token,
            count(c.id)::int as pendentes
       from public.empresas e
       join public.conteudos c on c.empresa_id = e.id and c.status = 'aprovacao'
      group by e.id, e.nome, e.telefone, e.portal_token
     having count(c.id) > 0
      order by e.nome asc`,
  )
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome ?? "Cliente",
    telefone: r.telefone ?? "",
    portalToken: r.portal_token ?? "",
    pendentes: Number(r.pendentes) || 0,
  }))
}

// Dados de pendência de um único cliente (usado pelo botão manual no detalhe).
export async function getPendenciaCliente(empresaId: string): Promise<ClientePendencia | null> {
  const rows = await query<{
    id: string
    nome: string
    telefone: string | null
    portal_token: string | null
    pendentes: number
  }>(
    `select e.id,
            e.nome,
            e.telefone,
            e.portal_token,
            (select count(*)::int from public.conteudos c where c.empresa_id = e.id and c.status = 'aprovacao') as pendentes
       from public.empresas e
      where e.id = $1`,
    [empresaId],
  )
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    id: r.id,
    nome: r.nome ?? "Cliente",
    telefone: r.telefone ?? "",
    portalToken: r.portal_token ?? "",
    pendentes: Number(r.pendentes) || 0,
  }
}

// Envia o aviso de pendências para UM cliente. Retorna o resultado detalhado.
export async function enviarAvisoCliente(cli: ClientePendencia): Promise<ResultadoAviso> {
  const base: ResultadoAviso = { id: cli.id, nome: cli.nome, pendentes: cli.pendentes, ok: false, enviado: false }

  if (cli.pendentes <= 0) {
    return { ...base, ok: true, motivo: "Sem conteúdos pendentes." }
  }
  const telefone = cli.telefone.replace(/\D/g, "")
  if (!telefone) {
    return { ...base, motivo: "Cliente sem telefone cadastrado." }
  }

  const texto = montarMensagemPendencia(cli.nome, cli.pendentes, urlPortalDe(cli.portalToken))
  const envio = await enviarTextoWhatsApp(telefone, texto, "contato")
  if (!envio.ok) {
    return { ...base, motivo: envio.erro || `Falha no envio (status ${envio.status}).` }
  }
  return { ...base, ok: true, enviado: true }
}

// Checa TODOS os clientes com pendências e envia o aviso para cada um.
// Falha em um cliente não interrompe os demais.
export async function enviarAvisosPendencias(): Promise<ResultadoAviso[]> {
  const clientes = await getClientesComPendencias()
  const resultados: ResultadoAviso[] = []
  for (const cli of clientes) {
    // Sequencial de propósito: evita rajada de mensagens simultâneas na Evolution.
    const r = await enviarAvisoCliente(cli)
    resultados.push(r)
  }
  return resultados
}
