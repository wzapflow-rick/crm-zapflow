import { MarketingView } from "@/components/marketing/marketing-view"
import { getClientes } from "@/lib/clientes-db"
import type { Cliente } from "@/lib/simple-data"

export default async function MarketingPage() {
  let clientes: Cliente[] = []
  try {
    clientes = await getClientes()
  } catch {
    clientes = []
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

  return <MarketingView clientes={opcoes} />
}
