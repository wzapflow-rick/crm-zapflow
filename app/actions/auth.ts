"use server"

import { redirect } from "next/navigation"
import type { Papel } from "@/lib/zapflow-data"
import {
  criarSessao,
  destruirSessao,
  verificarCredenciais,
  sessaoDemo,
  demoLiberada,
} from "@/lib/crm/auth"

export type EstadoLogin = { erro?: string }

// Login real por e-mail + senha (pgcrypto no banco).
export async function entrar(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim()
  const senha = String(formData.get("senha") ?? "")

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha." }
  }

  const sessao = await verificarCredenciais(email, senha)
  if (!sessao) {
    return { erro: "E-mail ou senha inválidos." }
  }

  await criarSessao(sessao)
  redirect("/")
}

// Atalho de demonstração (preview / fora de produção).
export async function entrarDemo(papel: Papel): Promise<void> {
  if (!demoLiberada) return
  await criarSessao(sessaoDemo(papel))
  redirect("/")
}

export async function sair(): Promise<void> {
  await destruirSessao()
  redirect("/login")
}
