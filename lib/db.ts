import { Pool, type QueryResultRow } from "pg"

// Pool singleton — evita estourar conexões em dev (hot reload) e serverless.
const globalForDb = globalThis as unknown as { _simplePool?: Pool }

function makePool() {
  const connectionString = process.env.CRM_DATABASE_URL
  if (!connectionString) {
    throw new Error("CRM_DATABASE_URL não configurada no ambiente.")
  }
  // O Postgres self-hosted da SIMPLE não usa TLS por padrão.
  // Se a string de conexão pedir SSL, habilitamos sem validar o certificado.
  const querSsl = /sslmode=require|ssl=true/i.test(connectionString)
  return new Pool({
    connectionString,
    ssl: querSsl ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
  })
}

export function getPool(): Pool {
  if (!globalForDb._simplePool) {
    globalForDb._simplePool = makePool()
  }
  return globalForDb._simplePool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = getPool()
  const result = await pool.query<T>(text, params as never)
  return result.rows
}
