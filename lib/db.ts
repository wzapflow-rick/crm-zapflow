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
  const pool = new Pool({
    connectionString,
    ssl: querSsl ? { rejectUnauthorized: false } : false,
    // 10 conexões: as páginas agora disparam muitas queries em paralelo (Promise.all).
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
  })
  // Sem este handler, uma conexão ociosa derrubada pela VPS vira exceção
  // não tratada e mata o processo serverless inteiro.
  pool.on("error", (err) => {
    console.error("[db] erro em conexão ociosa do pool:", err.message)
  })
  return pool
}

// Envolve uma promise de busca e devolve o fallback em caso de erro.
// Permite paralelizar várias buscas com Promise.all sem que uma falha
// (ex.: tabela que ainda não existe) derrube a página inteira.
export async function seguro<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
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
