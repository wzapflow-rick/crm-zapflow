"use server"

import { revalidatePath } from "next/cache"
import { getClientePorId } from "@/lib/clientes-db"
import {
  buscarMidias,
  buscarPerfil,
  gerarMidiasDemo,
  gerarPerfilDemo,
  renovarTokenLongo,
} from "@/lib/instagram-api"
import {
  desconectarInstagram,
  getConexaoInstagram,
  getTokenInstagram,
  marcarSyncInstagram,
  registrarErroInstagram,
  salvarConexaoInstagram,
  salvarMidiasInstagram,
} from "@/lib/instagram-db"

export type EstadoInstagram = { ok: boolean; erro?: string; mensagem?: string }

// Conecta em MODO DEMONSTRAÇÃO: gera perfil e mídias de exemplo (nunca chama a Meta).
export async function conectarDemoAction(empresaId: string): Promise<EstadoInstagram> {
  const id = empresaId.trim()
  if (!id) return { ok: false, erro: "Cliente não identificado." }
  try {
    const cliente = await getClientePorId(id)
    const perfil = gerarPerfilDemo(cliente?.nome ?? "Cliente")
    await salvarConexaoInstagram({
      empresaId: id,
      modo: "demo",
      igUserId: perfil.igUserId,
      username: perfil.username,
      nome: perfil.nome,
      accountType: perfil.accountType,
      profilePictureUrl: perfil.profilePictureUrl,
      seguidores: perfil.seguidores,
      segue: perfil.segue,
      midiaCount: perfil.midiaCount,
    })
    await salvarMidiasInstagram(id, gerarMidiasDemo())
    await marcarSyncInstagram(id, {
      seguidores: perfil.seguidores,
      segue: perfil.segue,
      midiaCount: perfil.midiaCount,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível ativar a demonstração: ${msg}` }
  }
  revalidatePath(`/clientes/${id}`)
  return { ok: true, mensagem: "Modo demonstração ativado." }
}

// Sincroniza dados da conta. No modo demo, regenera métricas de exemplo.
export async function sincronizarInstagramAction(empresaId: string): Promise<EstadoInstagram> {
  const id = empresaId.trim()
  if (!id) return { ok: false, erro: "Cliente não identificado." }

  const conexao = await getConexaoInstagram(id)
  if (!conexao) return { ok: false, erro: "Nenhuma conta conectada." }

  if (conexao.modo === "demo") {
    try {
      const cliente = await getClientePorId(id)
      const perfil = gerarPerfilDemo(cliente?.nome ?? "Cliente")
      await salvarMidiasInstagram(id, gerarMidiasDemo())
      await marcarSyncInstagram(id, {
        seguidores: perfil.seguidores,
        segue: perfil.segue,
        midiaCount: perfil.midiaCount,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido."
      return { ok: false, erro: `Falha ao atualizar demonstração: ${msg}` }
    }
    revalidatePath(`/clientes/${id}`)
    return { ok: true, mensagem: "Demonstração atualizada." }
  }

  // Modo real: usa o token salvo (renova se estiver perto de expirar).
  try {
    let token = await getTokenInstagram(id)
    if (!token) throw new Error("Token indisponível. Reconecte a conta.")

    const expira = conexao.tokenExpiraEm ? new Date(conexao.tokenExpiraEm).getTime() : 0
    const faltamMenosDe7Dias = expira - Date.now() < 1000 * 60 * 60 * 24 * 7
    if (faltamMenosDe7Dias) {
      try {
        const renovado = await renovarTokenLongo(token)
        token = renovado.accessToken
        await salvarConexaoInstagram({
          empresaId: id,
          modo: "real",
          accessToken: renovado.accessToken,
          tokenExpiraEm: new Date(Date.now() + renovado.expiresIn * 1000).toISOString(),
        })
      } catch {
        // segue com o token atual se a renovação falhar
      }
    }

    const perfil = await buscarPerfil(token)
    const midias = await buscarMidias(token)
    await salvarMidiasInstagram(id, midias)
    await salvarConexaoInstagram({
      empresaId: id,
      modo: "real",
      igUserId: perfil.igUserId,
      username: perfil.username,
      nome: perfil.nome,
      accountType: perfil.accountType,
      profilePictureUrl: perfil.profilePictureUrl,
      seguidores: perfil.seguidores,
      segue: perfil.segue,
      midiaCount: perfil.midiaCount,
    })
    await marcarSyncInstagram(id, {
      seguidores: perfil.seguidores,
      segue: perfil.segue,
      midiaCount: perfil.midiaCount,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    await registrarErroInstagram(id, msg).catch(() => {})
    return { ok: false, erro: `Falha na sincronização: ${msg}` }
  }

  revalidatePath(`/clientes/${id}`)
  return { ok: true, mensagem: "Instagram sincronizado." }
}

export async function desconectarInstagramAction(empresaId: string): Promise<EstadoInstagram> {
  const id = empresaId.trim()
  if (!id) return { ok: false, erro: "Cliente não identificado." }
  try {
    await desconectarInstagram(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido."
    return { ok: false, erro: `Não foi possível desconectar: ${msg}` }
  }
  revalidatePath(`/clientes/${id}`)
  return { ok: true, mensagem: "Conta desconectada." }
}
