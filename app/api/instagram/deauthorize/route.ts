import { type NextRequest, NextResponse } from "next/server"
import { parseSignedRequest } from "@/lib/instagram-signed-request"
import { excluirDadosPorIgUserId } from "@/lib/instagram-db"

// Callback de desautorização exigido pela Meta.
// É acionado quando o usuário remove o app SimpleOS-IG no Instagram.
// Recebemos um `signed_request` (form-urlencoded) e apagamos a conexão + mídias.
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
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Falha ao processar a desautorização." }, { status: 500 })
  }
}
