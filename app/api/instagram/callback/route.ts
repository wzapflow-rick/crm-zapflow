import { NextResponse, type NextRequest } from "next/server"
import {
  buscarMidias,
  buscarPerfil,
  getRedirectUri,
  trocarCodePorToken,
  trocarPorTokenLongo,
  verificarState,
} from "@/lib/instagram-api"
import { marcarSyncInstagram, salvarConexaoInstagram, salvarMidiasInstagram } from "@/lib/instagram-db"

// Callback do OAuth: troca o código por token, busca perfil + mídias e salva.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const code = params.get("code")
  const state = params.get("state")
  const erroOAuth = params.get("error")

  const empresaId = state ? verificarState(state) : null

  function voltar(erro?: string) {
    const destino = empresaId || ""
    const url = new URL(`/clientes/${destino}`, req.nextUrl.origin)
    url.searchParams.set("aba", "instagram")
    if (erro) url.searchParams.set("ig_erro", erro)
    else url.searchParams.set("ig_ok", "1")
    return NextResponse.redirect(url)
  }

  if (erroOAuth) return voltar("autorizacao_negada")
  if (!empresaId) return voltar("state_invalido")
  if (!code) return voltar("sem_codigo")

  try {
    const redirectUri = getRedirectUri(req.nextUrl.origin)
    const { accessToken: shortToken } = await trocarCodePorToken(code, redirectUri)
    const { accessToken: longToken, expiresIn } = await trocarPorTokenLongo(shortToken)
    const expiraEm = new Date(Date.now() + expiresIn * 1000).toISOString()

    const perfil = await buscarPerfil(longToken)
    await salvarConexaoInstagram({
      empresaId,
      modo: "real",
      igUserId: perfil.igUserId,
      username: perfil.username,
      nome: perfil.nome,
      accountType: perfil.accountType,
      profilePictureUrl: perfil.profilePictureUrl,
      seguidores: perfil.seguidores,
      segue: perfil.segue,
      midiaCount: perfil.midiaCount,
      accessToken: longToken,
      tokenExpiraEm: expiraEm,
    })

    // Primeira sincronização de mídias (não bloqueia a conexão se falhar).
    try {
      const midias = await buscarMidias(longToken)
      await salvarMidiasInstagram(empresaId, midias)
      await marcarSyncInstagram(empresaId, {
        seguidores: perfil.seguidores,
        segue: perfil.segue,
        midiaCount: perfil.midiaCount,
      })
    } catch {
      // ignora: a conexão foi criada e o usuário pode sincronizar manualmente depois.
    }

    return voltar()
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro"
    console.log("[v0] instagram callback erro:", msg)
    return voltar("falha_token")
  }
}
