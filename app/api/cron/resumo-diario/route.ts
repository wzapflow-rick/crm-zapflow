import { NextResponse } from "next/server"
import { montarResumoDiario } from "@/lib/resumo-diario"
import { enviarTextoWhatsApp } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"
// Dá folga para as queries + envio (Evolution pode demorar alguns segundos).
export const maxDuration = 60

// Mensagem fixa enviada no PRIVADO dos contatos configurados em CONTATOS_PRIVADOS.
// {{nome}} é substituído pelo nome de cada contato.
const MENSAGEM_PRIVADA = `Booom dia {{nome}}! 💜
Aqui é o Simple OS passando para avisar que os compromissos de hoje já foram enviados no grupo! 

✨ _não esqueça de manter seus compromissos atualizados no sistema para que nada passe despercebido_ 

✔️ _O hoje é uma oportunidade de ser melhor do que ontem._`

type ContatoPrivado = { nome: string; numero: string }

// Lê a variável CONTATOS_PRIVADOS no formato "Nome:5511999999999,Outro:5511888888888".
// O nome é opcional; se ausente, {{nome}} vira string vazia.
function lerContatosPrivados(): ContatoPrivado[] {
  const bruto = process.env.CONTATOS_PRIVADOS
  if (!bruto) return []
  return bruto
    .split(",")
    .map((parte) => {
      const item = parte.trim()
      if (!item) return null
      const idx = item.indexOf(":")
      if (idx === -1) {
        // Sem nome, só o número.
        return { nome: "", numero: item.replace(/\D/g, "") }
      }
      const nome = item.slice(0, idx).trim()
      const numero = item.slice(idx + 1).replace(/\D/g, "")
      return { nome, numero }
    })
    .filter((c): c is ContatoPrivado => Boolean(c && c.numero))
}

// Aceita a chamada do Vercel Cron (envia "Authorization: Bearer <CRON_SECRET>")
// e também uma chamada manual passando ?key=<CRON_SECRET> (útil para testar).
function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  const url = new URL(req.url)
  return url.searchParams.get("key") === secret
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 })
  }

  try {
    const grupo = process.env.SOCIOS_GROUP_ID
    if (!grupo) {
      return NextResponse.json({ ok: false, erro: "SOCIOS_GROUP_ID não configurado." }, { status: 500 })
    }

    const { texto, temItens } = await montarResumoDiario()

    const contatosPrivados = lerContatosPrivados()

    // Modo pré-visualização: retorna as mensagens montadas sem enviar no WhatsApp.
    const url = new URL(req.url)
    if (url.searchParams.get("preview") === "1") {
      return NextResponse.json({
        ok: true,
        preview: true,
        temItens,
        texto,
        privados: contatosPrivados.map((c) => ({
          nome: c.nome,
          numero: c.numero,
          texto: MENSAGEM_PRIVADA.replace("{{nome}}", c.nome),
        })),
      })
    }

    // 1) Resumo no grupo (comportamento original — não muda).
    const envio = await enviarTextoWhatsApp(grupo, texto, "grupo")

    if (!envio.ok) {
      return NextResponse.json(
        { ok: false, erro: envio.erro, status: envio.status },
        { status: 502 },
      )
    }

    // 2) Aviso fixo no privado de cada contato configurado.
    // Falha no privado não derruba o resumo do grupo (que já foi enviado com sucesso).
    const resultadosPrivados = await Promise.all(
      contatosPrivados.map(async (c) => {
        const r = await enviarTextoWhatsApp(c.numero, MENSAGEM_PRIVADA.replace("{{nome}}", c.nome), "contato")
        return { numero: c.numero, nome: c.nome, ok: r.ok, erro: r.erro }
      }),
    )

    return NextResponse.json({ ok: true, temItens, privados: resultadosPrivados })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 })
  }
}
