"use server"

import { redirect } from "next/navigation"
import { getMembroPorPin } from "@/lib/membros-db"
import { criarSessao, encerrarSessao } from "@/lib/sessao"

export type EstadoLogin = { erro?: string }

// Código mestre de administrador. Entra como "Admin" sem precisar estar na equipe.
// Pode ser sobrescrito via ADMIN_PIN no ambiente; o padrão é 001100.
const ADMIN_PIN = process.env.ADMIN_PIN || "001100"

export async function entrarComPinAction(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const pin = String(formData.get("pin") ?? "").trim()
  if (!pin) return { erro: "Digite seu PIN." }

  if (pin === ADMIN_PIN) {
    await criarSessao({
      id: "admin",
      nome: "Admin",
      iniciais: "AD",
      cor: "bg-primary",
      cargo: "Administrador",
    })
    redirect("/")
  }

  const membro = await getMembroPorPin(pin)
  if (!membro) return { erro: "PIN inválido. Verifique e tente novamente." }

  await criarSessao({
    id: membro.id,
    nome: membro.nome,
    iniciais: membro.iniciais,
    cor: membro.cor,
    cargo: membro.cargo,
  })
  // Sucesso: redireciona para o dashboard (lança NEXT_REDIRECT).
  redirect("/")
}

export async function sairAction(): Promise<void> {
  await encerrarSessao()
  redirect("/login")
}
