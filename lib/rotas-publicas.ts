// Rotas acessíveis sem sessão. Cada uma tem autenticação própria:
// login (PIN), portal (token do cliente), cron (CRON_SECRET),
// callbacks da Meta (state assinado / signed_request) e páginas legais exigidas pela Meta.
const PREFIXOS_PUBLICOS = [
  "/login",
  "/portal",
  "/api/portal",
  "/api/cron",
  "/api/instagram/callback",
  "/api/instagram/data-deletion",
  "/api/instagram/deauthorize",
  "/privacidade",
  "/exclusao-instagram",
]

// Casa o prefixo exato ou subcaminhos ("/portal/abc"), mas não "/portaladmin".
export function rotaPublica(pathname: string): boolean {
  return PREFIXOS_PUBLICOS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
