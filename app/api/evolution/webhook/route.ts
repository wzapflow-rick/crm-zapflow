import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getEmpresaAtivaId } from "@/lib/crm/queries"
import { normalizarTelefone } from "@/lib/crm/evolution"

// O webhook precisa rodar por requisição (nunca cacheado/estático).
export const dynamic = "force-dynamic"

const WEBHOOK_TOKEN = process.env.EVOLUTION_WEBHOOK_TOKEN

// Extrai o texto de uma mensagem da Evolution (vários formatos possíveis).
function extrairTexto(message: any): string | null {
  if (!message) return null
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.ephemeralMessage?.message?.extendedTextMessage?.text ??
    null
  )
}

export async function POST(req: Request) {
  // 1) Valida o token (segredo nosso, passado na URL do webhook).
  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  if (!WEBHOOK_TOKEN || token !== WEBHOOK_TOKEN) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let corpo: any
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ ok: true }) // ignora corpo inválido
  }

  try {
    // A Evolution manda { event, data } — data pode ser objeto ou array.
    const evento: string = corpo?.event ?? ""
    if (!evento.toLowerCase().includes("messages.upsert")) {
      return NextResponse.json({ ok: true }) // só tratamos mensagens novas
    }

    const itens = Array.isArray(corpo.data) ? corpo.data : [corpo.data]
    const empresaId = await getEmpresaAtivaId()
    if (!empresaId || empresaId === "demo") {
      return NextResponse.json({ ok: true })
    }

    for (const item of itens) {
      if (!item?.key) continue
      // Ignora mensagens enviadas por nós mesmos (já estão no inbox).
      if (item.key.fromMe) continue

      const texto = extrairTexto(item.message)
      if (!texto) continue // v1: só texto

      const evolutionId: string | null = item.key.id ?? null
      const remoteJid: string = item.key.remoteJid ?? ""
      const telefone = normalizarTelefone(remoteJid)
      if (!telefone) continue
      const nome: string = item.pushName || telefone

      await registrarMensagemRecebida(
        empresaId,
        telefone,
        nome,
        texto,
        evolutionId,
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.log(
      "[v0] Evolution webhook: erro ao processar:",
      err instanceof Error ? err.message : err,
    )
    // Responde 200 mesmo em erro para a Evolution não ficar reenviando.
    return NextResponse.json({ ok: true })
  }
}

// Faz upsert da conversa pelo telefone e insere a mensagem (idempotente).
async function registrarMensagemRecebida(
  empresaId: string,
  telefone: string,
  nome: string,
  texto: string,
  evolutionId: string | null,
) {
  // Dedupe: se já gravamos essa mensagem (id da Evolution), não repete.
  if (evolutionId) {
    const existe = await query(
      `SELECT 1 FROM mensagens WHERE empresa_id = $1 AND evolution_message_id = $2 LIMIT 1`,
      [empresaId, evolutionId],
    )
    if (existe.length > 0) return
  }

  // Acha a conversa pelo telefone; cria se não existir.
  const achada = await query<{ id: string }>(
    `SELECT id FROM conversas WHERE empresa_id = $1 AND contato_telefone = $2 LIMIT 1`,
    [empresaId, telefone],
  )

  let conversaId: string
  if (achada.length > 0) {
    conversaId = achada[0].id
    await query(
      `UPDATE conversas
         SET ultima_atividade = now(),
             nao_lidas = nao_lidas + 1,
             status = CASE WHEN status = 'resolvida' THEN 'aberta' ELSE status END
       WHERE id = $1 AND empresa_id = $2`,
      [conversaId, empresaId],
    )
  } else {
    const iniciais = nome.slice(0, 2).toUpperCase()
    const nova = await query<{ id: string }>(
      `INSERT INTO conversas
         (empresa_id, contato_nome, contato_telefone, iniciais, cor, status, nao_lidas, ultima_atividade)
       VALUES ($1, $2, $3, $4, 'bg-chart-2', 'aberta', 1, now())
       RETURNING id`,
      [empresaId, nome, telefone, iniciais],
    )
    conversaId = nova[0].id
  }

  await query(
    `INSERT INTO mensagens (empresa_id, conversa_id, autor, conteudo, evolution_message_id)
     VALUES ($1, $2, 'cliente', $3, $4)`,
    [empresaId, conversaId, texto, evolutionId],
  )
}
