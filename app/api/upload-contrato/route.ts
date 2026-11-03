import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { exigirUsuarioApi } from "@/lib/auth"

const TAMANHO_MAXIMO = 10 * 1024 * 1024 // 10 MB
const TIPOS_ACEITOS = ["application/pdf"]

// Recebe o PDF do contrato e devolve a URL no Vercel Blob. Só a equipe logada envia.
// O sufixo aleatório impede adivinhar o endereço a partir do nome do arquivo.
export async function POST(request: NextRequest) {
  const usuario = await exigirUsuarioApi()
  if (usuario instanceof Response) return usuario
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
    }
    if (!TIPOS_ACEITOS.includes(file.type)) {
      return NextResponse.json({ error: "Envie o contrato em PDF." }, { status: 400 })
    }
    if (file.size > TAMANHO_MAXIMO) {
      return NextResponse.json({ error: "Arquivo muito grande (máx. 10 MB)." }, { status: 400 })
    }

    const nomeSeguro = file.name.replace(/[^\w.-]+/g, "-").slice(-80) || "contrato.pdf"
    const blob = await put(`contratos-clientes/${nomeSeguro}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/pdf",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[upload-contrato] falha:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Falha ao enviar o contrato." }, { status: 500 })
  }
}
