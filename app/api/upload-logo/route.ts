import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

const TAMANHO_MAXIMO = 4 * 1024 * 1024 // 4 MB
const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]

// Recebe a logo/foto do cliente e devolve a URL pública no Vercel Blob.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
    }
    if (!TIPOS_ACEITOS.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato inválido. Use PNG, JPG, WEBP, GIF ou SVG." },
        { status: 400 },
      )
    }
    if (file.size > TAMANHO_MAXIMO) {
      return NextResponse.json({ error: "Imagem muito grande (máx. 4 MB)." }, { status: 400 })
    }

    const blob = await put(`logos-clientes/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Erro no upload da logo:", error)
    return NextResponse.json({ error: "Falha ao enviar a imagem." }, { status: 500 })
  }
}
