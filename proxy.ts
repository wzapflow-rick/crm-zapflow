import { NextResponse, type NextRequest } from "next/server"
import { COOKIE_SESSAO, desserializarSessao } from "@/lib/sessao-token"
import { rotaPublica } from "@/lib/rotas-publicas"

// Primeira barreira: nenhuma página ou API interna é renderizada sem cookie
// de sessão com assinatura válida. Isso cobre requisições RSC de navegação
// parcial, em que o layout não é executado de novo. A checagem de membro
// ativo continua em lib/auth.ts (páginas, actions e APIs).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (rotaPublica(pathname)) return NextResponse.next()

  const cookie = req.cookies.get(COOKIE_SESSAO)?.value
  if (cookie && desserializarSessao(cookie)) return NextResponse.next()

  if (pathname.startsWith("/api/") && pathname !== "/api/instagram/connect") {
    return NextResponse.json(
      { erro: "Não autenticado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
  }
  return NextResponse.redirect(new URL("/login", req.url))
}

export const config = {
  // Ignora assets do Next e arquivos estáticos (qualquer caminho com extensão).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
}
