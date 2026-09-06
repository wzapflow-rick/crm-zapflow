import { Pool, type QueryResultRow } from "pg"

// Pool singleton — evita estourar conexões em dev (hot reload) e serverless.
const globalForDb = globalThis as unknown as { _simplePool?: Pool }

function makePool() {
  const connectionString = process.env.CRM_DATABASE_URL
  if (!connectionString) {
    throw new Error("CRM_DATABASE_URL não configurada no ambiente.")
  }
  // Remove parâmetros de SSL da URL para que o pg-connection-string não
  // sobrescreva a configuração explícita nem emita avisos de compatibilidade.
  const url = new URL(connectionString)
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase()
  const sslParam = url.searchParams.get("ssl")?.toLowerCase()
  const querSsl =
    sslParam === "true" ||
    (sslMode !== undefined && !["disable", "allow"].includes(sslMode))

  url.searchParams.delete("sslmode")
  url.searchParams.delete("ssl")
  url.searchParams.delete("uselibpqcompat")

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: querSsl ? { rejectUnauthorized: false } : false,
    // Limita o fan-out por instância serverless para não saturar o Postgres.
    max: 5,
    min: 0,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 5_000,
    // O limite é aplicado no cliente. Proxies como PgBouncer não aceitam
    // statement_timeout como parâmetro de inicialização da conexão.
    query_timeout: 10_000,
    allowExitOnIdle: true,
    application_name: "simple-crm",
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
  const inicio = performance.now()

  try {
    const result = await pool.query<T>(text, params as never)
    const duracaoMs = Math.round(performance.now() - inicio)
    if (duracaoMs >= 500) {
      const operacao = text.trim().split(/\s+/, 1)[0]?.toUpperCase() ?? "QUERY"
      console.warn(`[db] consulta lenta: ${operacao} em ${duracaoMs}ms (${result.rowCount ?? 0} linhas)`)
    }
    return result.rows
  } catch (error) {
    const duracaoMs = Math.round(performance.now() - inicio)
    console.error(`[db] consulta falhou após ${duracaoMs}ms:`, error instanceof Error ? error.message : error)
    throw error
  }
}
