import { FinanceiroView } from "@/components/financeiro/financeiro-view"
import { getResumoFinanceiro, getLancamentos, type Lancamento, type ResumoFinanceiro } from "@/lib/financeiro-db"
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

  try {
    const [r, l] = await Promise.all([getResumoFinanceiro(mes), getLancamentos(mes)])
    resumo = r
    lancamentos = l
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro desconhecido ao buscar os dados financeiros."
  }

  try {
    const cs = await getClientes()
    clientes = cs.map((c) => ({ id: c.id, nome: c.nome }))
  } catch {
    // Sem clientes: o módulo ainda funciona para lançamentos
  }

  return <FinanceiroView resumo={resumo} lancamentos={lancamentos} clientes={clientes} erro={erro} />
}
