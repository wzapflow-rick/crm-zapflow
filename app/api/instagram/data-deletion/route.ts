import { type NextRequest, NextResponse } from "next/server"
import { parseSignedRequest } from "@/lib/instagram-signed-request"
import { excluirDadosPorIgUserId } from "@/lib/instagram-db"

// Callback de exclusão de dados exigido pela Meta.
// É acionado quando o usuário solicita a exclusão dos seus dados.
// Precisamos: (1) apagar os dados, (2) responder um JSON com `url` (onde o
// usuário confirma o status) e `confirmation_code`.
// Docs: developers.facebook.com/docs/development/create-an-app/data-deletion-callback
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const signed = form.get("signed_request")
    if (typeof signed !== "string") {
      return NextResponse.json({ error: "signed_request ausente." }, { status: 400 })
    }

    const payload = parseSignedRequest(signed)
    if (!payload?.user_id) {
      return NextResponse.json({ error: "signed_request inválido." }, { status: 400 })
    }

    await excluirDadosPorIgUserId(payload.user_id)

    const code = `IGDEL-${payload.user_id}-${Date.now().toString(36)}`
    const origin = new URL(req.url).origin
    const url = `${origin}/exclusao-instagram?code=${encodeURIComponent(code)}`

    return NextResponse.json({ url, confirmation_code: code })
  } catch {
    return NextResponse.json({ error: "Falha ao processar a exclusão de dados." }, { status: 500 })
  }
}
