import { NextResponse, type NextRequest } from "next/server"
import { buildAuthUrl, getRedirectUri, instagramConfigurado } from "@/lib/instagram-api"

// Inicia o OAuth do Instagram: redireciona para a tela de autorização da Meta.
export async function GET(req: NextRequest) {
  const empresaId = req.nextUrl.searchParams.get("empresa")?.trim()
  if (!empresaId) {
    return NextResponse.json({ erro: "Cliente não informado." }, { status: 400 })
  }

  if (!instagramConfigurado()) {
    // Sem credenciais da Meta ainda: volta para o cliente com aviso.
    const url = new URL(`/clientes/${empresaId}`, req.nextUrl.origin)
    url.searchParams.set("aba", "instagram")
    url.searchParams.set("ig_erro", "nao_configurado")
    return NextResponse.redirect(url)
  }

  const redirectUri = getRedirectUri(req.nextUrl.origin)
  return NextResponse.redirect(buildAuthUrl(empresaId, redirectUri))
}
