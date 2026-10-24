"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getMembroPorPin } from "@/lib/membros-db"
import { criarSessao, encerrarSessao } from "@/lib/sessao"
import { ID_ADMIN } from "@/lib/auth"
import { limparFalhas, registrarFalha, segredoIgual, tentativasBloqueadas } from "@/lib/seguranca"

export type EstadoLogin = { erro?: string }

// Código mestre do administrador. Não há valor padrão no código: sem ADMIN_PIN
// (ou ADMIN_PASSWORD) o acesso de admin fica desativado.
function codigoAdmin(): string | null {
  return process.env.ADMIN_PIN || process.env.ADMIN_PASSWORD || null
}

async function chaveCliente(): Promise<string> {
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido"
  return `login:${ip}`
}

export async function entrarComPinAction(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const pin = String(formData.get("pin") ?? "").trim()
  if (!pin) return { erro: "Digite seu PIN." }
  if (pin.length > 64) return { erro: "PIN inválido. Verifique e tente novamente." }

  const chave = await chaveCliente()
  if (tentativasBloqueadas(chave)) {
    return { erro: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }
  }

  let usuario = null
  if (segredoIgual(pin, codigoAdmin())) {
    usuario = { id: ID_ADMIN, nome: "Admin", iniciais: "AD", cor: "bg-primary", cargo: "Administrador" }
  } else if (/^\d{4,8}$/.test(pin)) {
    const membro = await getMembroPorPin(pin)
    if (membro) {
      usuario = { id: membro.id, nome: membro.nome, iniciais: membro.iniciais, cor: membro.cor, cargo: membro.cargo }
    }
  }

  if (!usuario) {
    registrarFalha(chave)
    return { erro: "PIN inválido. Verifique e tente novamente." }
  }

  const criada = await criarSessao(usuario)
  if (!criada) {
    console.error("[auth] CRM_SESSION_SECRET não configurado; login bloqueado.")
    return { erro: "Login indisponível: configuração de segurança ausente no servidor." }
  }
  limparFalhas(chave)
  redirect("/")
}

export async function sairAction(): Promise<void> {
  await encerrarSessao()
  redirect("/login")
}
