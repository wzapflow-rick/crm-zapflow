import { Pool, type QueryResultRow } from "pg"

// Conexão dedicada ao banco `crm` (isolada do banco do Cardápio).
// Aponta para a string de conexão em CRM_DATABASE_URL.
// Ex.: postgres://usuario:senha@host:5432/crm
//
// Enquanto CRM_DATABASE_URL não estiver definida (ex.: preview no v0, que não
// alcança o Postgres da VPS), a aplicação usa os dados mock em
// lib/zapflow-data.ts. Ao publicar na VPS com a env configurada, tudo passa a
// ler/escrever no banco real automaticamente.

export const isDbConfigured = Boolean(process.env.CRM_DATABASE_URL)

// Singleton do pool — evita estourar conexões com o hot-reload do Next.
const globalForPg = globalThis as unknown as { crmPool?: Pool }

function getPool(): Pool {
  if (!globalForPg.crmPool) {
    const pool = new Pool({
      connectionString: process.env.CRM_DATABASE_URL,
      // VPS própria geralmente sem SSL; ative via sslmode=require na URL se precisar.
      ssl: process.env.CRM_DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
      // Falha rápido em vez de pendurar a requisição se a VPS não responder.
      connectionTimeoutMillis: 8_000,
      // Aborta queries que travarem (ms).
      statement_timeout: 10_000,
    })

    // CRÍTICO: sem este listener, um erro em conexão ociosa (ex.: a VPS derruba
    // a conexão) vira exceção não tratada e DERRUBA a função serverless inteira.
    // Com o listener, o erro é apenas logado e o pool se recupera.
    pool.on("error", (err) => {
      console.log("[v0] CRM: erro em conexão ociosa do pool:", err.message)
    })

    globalForPg.crmPool = pool
  }
  return globalForPg.crmPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = getPool()
  const res = await pool.query<T>(text, params as never)
  return res.rows
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}
