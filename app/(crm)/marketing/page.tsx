import { MarketingView } from "@/components/marketing/marketing-view"
import { getClientes } from "@/lib/clientes-db"
import type { Cliente } from "@/lib/simple-data"
import { getAprendizadosGlobais, getUltimaAnaliseGlobal, type AprendizadoGlobal } from "@/lib/global-db"

// Lê o banco a cada request: garante que clientes recém-criados apareçam no seletor.
export const dynamic = "force-dynamic"

export default async function MarketingPage() {
  let clientes: Cliente[] = []
  try {
    clientes = await getClientes()
  } catch {
    clientes = []
  }

  let aprendizadosGlobais: AprendizadoGlobal[] = []
  let ultimaAnaliseGlobal: string | null = null
  try {
    ;[aprendizadosGlobais, ultimaAnaliseGlobal] = await Promise.all([
      getAprendizadosGlobais(),
      getUltimaAnaliseGlobal(),
    ])
  } catch {
    aprendizadosGlobais = []
  }

  // Passa apenas os campos necessários ao seletor (evita enviar dados demais ao client).
  const opcoes = clientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    segmento: c.segmento,
    status: c.status,
    iniciais: c.iniciais,
    cor: c.cor,
    logoUrl: c.logoUrl ?? "",
  }))

  return (
    <MarketingView
      clientes={opcoes}
      aprendizadosGlobais={aprendizadosGlobais}
      ultimaAnaliseGlobal={ultimaAnaliseGlobal}
    />
  )
}
