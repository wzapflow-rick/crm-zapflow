"use server"

import { redirect } from "next/navigation"
import { getMembroPorPin } from "@/lib/membros-db"
import { criarSessao, encerrarSessao } from "@/lib/sessao"

export type EstadoLogin = { erro?: string }

export async function entrarComPinAction(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const pin = String(formData.get("pin") ?? "").trim()
  if (!pin) return { erro: "Digite seu PIN." }

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
