import { FinanceiroView } from "@/components/financeiro/financeiro-view"
import { seguro } from "@/lib/db"
import {
  getResumoFinanceiro,
  getLancamentos,
  getAvulsosComoLancamentos,
  type Lancamento,
  type ResumoFinanceiro,
} from "@/lib/financeiro-db"
import { getClientes } from "@/lib/clientes-db"
import { mesAtual } from "@/lib/financeiro-types"

export const dynamic = "force-dynamic"

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes: mesParam } = await searchParams
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? (mesParam as string) : mesAtual()

  let resumo: ResumoFinanceiro = {
    mes,
    receitaMrr: 0,
    receitaAvulsa: 0,
    receitaLancamentos: 0,
    receitaTotal: 0,
    custoTotal: 0,
    lucro: 0,
    margem: 0,
    meta: 0,
    progressoMeta: 0,
  }
  let lancamentos: Lancamento[] = []
  let clientes: { id: string; nome: string }[] = []
  let erro: string | undefined

  // Todas as buscas em paralelo: uma ida ao banco em vez de 2 em série.
  const [dadosFinanceiros, cs] = await Promise.all([
    Promise.all([getResumoFinanceiro(mes), getLancamentos(mes), getAvulsosComoLancamentos(mes)]).catch(
      (e: unknown) => {
        erro = e instanceof Error ? e.message : "Erro desconhecido ao buscar os dados financeiros."
        return null
      },
    ),
    seguro(getClientes(), []),
  ])
  if (dadosFinanceiros) {
    const [resumoDb, lancamentosDb, avulsos] = dadosFinanceiros
    resumo = resumoDb
    // Avulsos entram como itens virtuais no topo (só exibição); já estão somados no resumo.
    lancamentos = [...avulsos, ...lancamentosDb]
  }
  clientes = cs.map((c) => ({ id: c.id, nome: c.nome }))

  return <FinanceiroView resumo={resumo} lancamentos={lancamentos} clientes={clientes} erro={erro} />
}
