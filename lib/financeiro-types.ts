// Tipos compartilhados do módulo Financeiro (sem "server-only" para uso em client components)

export type TipoLancamento = "receita" | "custo"

export const TIPOS_LANCAMENTO = [
  { id: "receita", label: "Receita" },
  { id: "custo", label: "Custo" },
] as const

// Categorias sugeridas (texto livre no banco, mas oferecemos opções comuns)
export const CATEGORIAS_CUSTO = [
  "Equipe",
  "Ferramentas",
  "Tráfego/Anúncios",
  "Impostos",
  "Infraestrutura",
  "Terceiros",
  "Outros",
] as const

export const CATEGORIAS_RECEITA = ["Recorrente", "Projeto", "Setup", "Extra", "Outros"] as const

export type Lancamento = {
  id: string
  tipo: TipoLancamento
  descricao: string
  categoria: string
  valor: number
  recorrente: boolean
  // Competência no formato "YYYY-MM". Para lançamentos recorrentes é null (vale todo mês).
  competencia: string | null
  empresaId: string
  empresaNome: string | null
  // Item virtual (ex.: pagamento avulso vindo do cadastro do cliente). Não existe na
  // tabela de lançamentos, portanto não pode ser editado/excluído aqui.
  virtual?: boolean
}

export type LancamentoInput = {
  tipo: TipoLancamento
  descricao: string
  categoria: string
  valor: number
  recorrente: boolean
  competencia: string | null
  empresaId: string | null
}

// Resumo financeiro calculado para um mês específico
export type ResumoFinanceiro = {
  mes: string // "YYYY-MM"
  receitaMrr: number // soma do MRR real dos clientes recorrentes
  receitaAvulsa: number // soma dos pagamentos avulsos de clientes cadastrados no mês
  receitaLancamentos: number // receitas avulsas/recorrentes lançadas
  receitaTotal: number
  custoTotal: number
  lucro: number
  margem: number // % do lucro sobre a receita
  meta: number
  progressoMeta: number // % da receita sobre a meta
}

// Formata número como moeda brasileira
export function brl(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

// "YYYY-MM" do mês atual
export function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

// Rótulo amigável de um mês "YYYY-MM" → "Junho 2026"
export function rotuloMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number)
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]
  return `${nomes[(m || 1) - 1]} ${ano}`
}

// Soma/subtrai meses de um "YYYY-MM"
export function deslocarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number)
  const d = new Date(ano, (m || 1) - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
