import "server-only"
import { query } from "@/lib/db"
import {
  TIPOS_LANCAMENTO,
  mesAtual,
  type Lancamento,
  type LancamentoInput,
  type ResumoFinanceiro,
  type TipoLancamento,
} from "@/lib/financeiro-types"

export type { Lancamento, LancamentoInput, ResumoFinanceiro, TipoLancamento }

const TIPO_IDS = TIPOS_LANCAMENTO.map((t) => t.id) as TipoLancamento[]

function normalizarTipo(valor: string | null | undefined): TipoLancamento {
  return (TIPO_IDS.includes(valor as TipoLancamento) ? valor : "custo") as TipoLancamento
}

type LancamentoRow = {
  id: string
  tipo: string | null
  descricao: string
  categoria: string | null
  valor: string | number | null
  recorrente: boolean | null
  competencia: string | null
  empresa_id: string | null
  empresa_nome: string | null
}

function mapRow(r: LancamentoRow): Lancamento {
  return {
    id: r.id,
    tipo: normalizarTipo(r.tipo),
    descricao: r.descricao,
    categoria: r.categoria ?? "",
    valor: r.valor != null ? Number(r.valor) : 0,
    recorrente: Boolean(r.recorrente),
    competencia: r.competencia ?? null,
    empresaId: r.empresa_id ?? "",
    empresaNome: r.empresa_nome ?? null,
  }
}

const SELECT_COLS = `l.id, l.tipo, l.descricao, l.categoria, l.valor::text as valor,
  l.recorrente, l.competencia, l.empresa_id, e.nome as empresa_nome`

// Lista lançamentos visíveis em um mês: recorrentes (valem todo mês) + avulsos daquele mês.
export async function getLancamentos(mes: string = mesAtual()): Promise<Lancamento[]> {
  const rows = await query<LancamentoRow>(
    `select ${SELECT_COLS}
     from public.financeiro_lancamentos l
     left join public.empresas e on e.id = l.empresa_id
     where l.recorrente = true or l.competencia = $1
     order by l.recorrente desc, l.tipo asc, l.valor desc`,
    [mes],
  )
  return rows.map(mapRow)
}

export async function criarLancamento(input: LancamentoInput): Promise<void> {
  await query(
    `insert into public.financeiro_lancamentos
       (tipo, descricao, categoria, valor, recorrente, competencia, empresa_id)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.tipo,
      input.descricao,
      input.categoria || null,
      input.valor,
      input.recorrente,
      input.recorrente ? null : input.competencia,
      input.empresaId || null,
    ],
  )
}

export async function atualizarLancamento(id: string, input: LancamentoInput): Promise<void> {
  await query(
    `update public.financeiro_lancamentos
     set tipo = $2, descricao = $3, categoria = $4, valor = $5,
         recorrente = $6, competencia = $7, empresa_id = $8, updated_at = now()
     where id = $1`,
    [
      id,
      input.tipo,
      input.descricao,
      input.categoria || null,
      input.valor,
      input.recorrente,
      input.recorrente ? null : input.competencia,
      input.empresaId || null,
    ],
  )
}

export async function excluirLancamento(id: string): Promise<void> {
  await query(`delete from public.financeiro_lancamentos where id = $1`, [id])
}

// Lê a meta de um mês (0 se não houver)
export async function getMeta(mes: string): Promise<number> {
  const rows = await query<{ valor: string | number | null }>(
    `select valor::text as valor from public.financeiro_metas where competencia = $1`,
    [mes],
  )
  return rows.length && rows[0].valor != null ? Number(rows[0].valor) : 0
}

// Salva (upsert) a meta de um mês
export async function salvarMeta(mes: string, valor: number): Promise<void> {
  await query(
    `insert into public.financeiro_metas (competencia, valor)
     values ($1, $2)
     on conflict (competencia) do update set valor = excluded.valor, updated_at = now()`,
    [mes, valor],
  )
}

// Soma do MRR recorrente real dos clientes ativos (exclui pausados/encerrados)
async function getReceitaMrr(): Promise<number> {
  const rows = await query<{ total: string | number | null }>(
    `select coalesce(sum(mrr), 0)::text as total
     from public.empresas
     where coalesce(status, '') not in ('pausado', 'churn', 'encerrado', 'inativo')
       and recorrente is not false`,
  )
  return rows.length && rows[0].total != null ? Number(rows[0].total) : 0
}

// Soma dos pagamentos AVULSOS (recorrente = false) cadastrados no mês informado.
// Um avulso é receita pontual: conta no mês em que o cliente foi cadastrado (created_at).
async function getReceitaAvulsa(mes: string): Promise<number> {
  const rows = await query<{ total: string | number | null }>(
    `select coalesce(sum(mrr), 0)::text as total
     from public.empresas
     where recorrente is false
       and to_char(created_at, 'YYYY-MM') = $1`,
    [mes],
  )
  return rows.length && rows[0].total != null ? Number(rows[0].total) : 0
}

// Calcula o resumo financeiro de um mês: receita (MRR + lançamentos), custos, lucro e meta.
export async function getResumoFinanceiro(mes: string = mesAtual()): Promise<ResumoFinanceiro> {
  const [lancamentos, receitaMrr, receitaAvulsa, meta] = await Promise.all([
    getLancamentos(mes),
    getReceitaMrr(),
    getReceitaAvulsa(mes),
    getMeta(mes),
  ])

  let receitaLancamentos = 0
  let custoTotal = 0
  for (const l of lancamentos) {
    if (l.tipo === "receita") receitaLancamentos += l.valor
    else custoTotal += l.valor
  }

  const receitaTotal = receitaMrr + receitaAvulsa + receitaLancamentos
  const lucro = receitaTotal - custoTotal
  const margem = receitaTotal > 0 ? Math.round((lucro / receitaTotal) * 100) : 0
  const progressoMeta = meta > 0 ? Math.min(100, Math.round((receitaTotal / meta) * 100)) : 0

  return {
    mes,
    receitaMrr,
    receitaAvulsa,
    receitaLancamentos,
    receitaTotal,
    custoTotal,
    lucro,
    margem,
    meta,
    progressoMeta,
  }
}
