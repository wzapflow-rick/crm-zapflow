import { NextResponse, type NextRequest } from "next/server"
import {
  buscarPerfil,
  getRedirectUri,
  trocarCodePorToken,
  trocarPorTokenLongo,
  verificarState,
} from "@/lib/instagram-api"
import { salvarConexaoInstagram } from "@/lib/instagram-db"
import { sincronizarConta } from "@/lib/instagram-sync"
import { depsSyncPadrao } from "@/lib/instagram-sync-repo"
import { atualizarInteligenciaConfiavel } from "@/lib/atualizacao-inteligencia"

export const maxDuration = 120
const PRAZO_PRIMEIRA_COLETA_MS = 60_000

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

    // Primeira coleta com prazo curto. Se não terminar, o estado fica
    // registrado e a rotina diária ou o botão continuam de onde parou.
    try {
      const resultado = await sincronizarConta(
        empresaId,
        { origem: "oauth", prazo: Date.now() + PRAZO_PRIMEIRA_COLETA_MS },
        depsSyncPadrao(),
      )
      if (resultado.estado === "concluida") {
        const analise = await atualizarInteligenciaConfiavel(empresaId)
        if (!analise.ok) console.warn("[inteligencia] OAuth concluído sem atualização analítica:", { empresaId })
      }
    } catch {
      // A conexão foi criada; a coleta pode ser refeita depois.
    }

    return voltar()
  } catch {
    console.warn("[instagram] falha ao concluir a conexão OAuth", { empresaId })
    return voltar("falha_token")
  }
}
