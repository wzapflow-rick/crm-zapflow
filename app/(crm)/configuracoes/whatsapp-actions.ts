"use server"

import { estadoInstancia, enviarTextoWhatsApp, type EstadoWhatsApp } from "@/lib/whatsapp"
import { montarResumoDiario } from "@/lib/resumo-diario"

export type DiagnosticoWhatsApp = {
  ok: boolean
  estado?: EstadoWhatsApp
  previa?: string
  temItens?: boolean
  erroPrevia?: string
}

// Verifica a configuração, o estado da conexão da instância e monta uma prévia
// da mensagem de "bom dia" com os dados de hoje (sem enviar).
export async function diagnosticarWhatsAppAction(): Promise<DiagnosticoWhatsApp> {
  const estado = await estadoInstancia()

  let previa: string | undefined
  let temItens: boolean | undefined
  let erroPrevia: string | undefined
  try {
    const resumo = await montarResumoDiario()
    previa = resumo.texto
    temItens = resumo.temItens
  } catch (e) {
    erroPrevia = e instanceof Error ? e.message : "Erro ao montar a prévia."
  }

  return { ok: true, estado, previa, temItens, erroPrevia }
}

export type EnvioManual = { ok: boolean; erro?: string; enviado?: boolean }

// Dispara a mensagem de "bom dia" agora, no grupo, para testar o envio de ponta a ponta.
export async function enviarResumoAgoraAction(): Promise<EnvioManual> {
  const grupo = process.env.SOCIOS_GROUP_ID
  if (!grupo) {
    return { ok: false, erro: "SOCIOS_GROUP_ID não configurado." }
  }

  let texto: string
  try {
    const resumo = await montarResumoDiario()
    texto = resumo.texto
  } catch (e) {
    return { ok: false, erro: `Falha ao montar a mensagem: ${e instanceof Error ? e.message : "erro desconhecido"}` }
  }

  const envio = await enviarTextoWhatsApp(grupo, texto)
  if (!envio.ok) {
    return { ok: false, erro: envio.erro || `Envio falhou (status ${envio.status}).` }
  }
  return { ok: true, enviado: true }
}
