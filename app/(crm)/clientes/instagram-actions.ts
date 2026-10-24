"use server"


import { exigirUsuario } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { getClientePorId } from "@/lib/clientes-db"
import { gerarMidiasDemo, gerarPerfilDemo } from "@/lib/instagram-api"
import {
  desconectarInstagram,
  getConexaoInstagram,
  marcarSyncInstagram,
  salvarConexaoInstagram,
  salvarMidiasInstagram,
} from "@/lib/instagram-db"
import { sincronizarConta } from "@/lib/instagram-sync"
import { depsSyncPadrao } from "@/lib/instagram-sync-repo"
import { atualizarInteligenciaConfiavel } from "@/lib/atualizacao-inteligencia"

export type EstadoInstagram = { ok: boolean; erro?: string; mensagem?: string }

// O botão manual tem um prazo menor que a rotina diária; o que não couber
// continua na próxima execução (os lotes já ficam gravados).
const PRAZO_MANUAL_MS = 120_000

// Conecta em MODO DEMONSTRAÇÃO: gera perfil e mídias de exemplo (nunca chama a Meta).
export async function conectarDemoAction(empresaId: string): Promise<EstadoInstagram> {
  await exigirUsuario()
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

// Sincroniza dados da conta. No modo demo, regenera métricas de exemplo
// (mesmos ids, sem duplicar). No modo real, usa a mesma função da rotina diária.
export async function sincronizarInstagramAction(empresaId: string): Promise<EstadoInstagram> {
  await exigirUsuario()
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

  const resultado = await sincronizarConta(
    id,
    { origem: "manual", prazo: Date.now() + PRAZO_MANUAL_MS },
    depsSyncPadrao(),
  ).catch(() => null)

  revalidatePath(`/clientes/${id}`)
  if (!resultado) return { ok: false, erro: "Falha na sincronização. Tente novamente em instantes." }

  if (resultado.estado === "concluida") {
    const analise = await atualizarInteligenciaConfiavel(id)
    if (!analise.ok) console.warn("[inteligencia] sync Instagram concluído sem atualização analítica:", { empresaId: id })
    return { ok: true, mensagem: resultado.mensagem }
  }
  return { ok: false, erro: resultado.mensagem }
}

export async function desconectarInstagramAction(empresaId: string): Promise<EstadoInstagram> {
  await exigirUsuario()
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
