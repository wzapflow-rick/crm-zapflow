import { NextResponse, type NextRequest } from "next/server"

// Proteção leve de borda: só checa a PRESENÇA do cookie de sessão.
// A validação real da assinatura acontece no layout do CRM (runtime Node),
// pois o middleware roda no edge e não deve depender do segredo HMAC.
const COOKIE = "crm_sessao"

export function proxy(req: NextRequest) {
  const temCookie = req.cookies.has(COOKIE)
  const { pathname } = req.nextUrl

  if (!temCookie) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Protege tudo, exceto login, rotas de API (têm proteção própria por token),
  // assets estáticos e rotas internas do Next.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
}
