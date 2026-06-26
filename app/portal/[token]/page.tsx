import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { PortalCliente } from "@/components/portal/portal-cliente"
import {
  getClientePorToken,
  getMetas,
  getEventos,
  getConteudos,
  getEstrategia,
  getArquivos,
  getMensagens,
  getResultados,
} from "@/lib/clientes-db"
import { getMembros } from "@/lib/membros-db"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Portal do Cliente — SIMPLE",
  description: "Acompanhe suas entregas, materiais e conversas com a SIMPLE.",
  robots: { index: false, follow: false },
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const cliente = await getClientePorToken(token).catch(() => null)
  if (!cliente) {
    notFound()
  }

  const [metas, eventos, conteudos, estrategia, arquivos, mensagens, resultados, membros] =
    await Promise.all([
      getMetas(cliente.id).catch(() => []),
      getEventos(cliente.id).catch(() => []),
      getConteudos(cliente.id).catch(() => []),
      getEstrategia(cliente.id).catch(() => ({ estrategiaAtual: [], insights: [], concorrentes: [] })),
      getArquivos(cliente.id).catch(() => []),
      getMensagens(cliente.id).catch(() => []),
      getResultados(cliente.id).catch(() => []),
      getMembros().catch(() => []),
    ])

  return (
    <PortalCliente
      token={token}
      cliente={cliente}
      membros={membros}
      metas={metas}
      eventos={eventos}
      conteudos={conteudos}
      estrategia={estrategia}
      arquivos={arquivos}
      mensagens={mensagens}
      resultados={resultados}
    />
  )
}
