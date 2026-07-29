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

  // ── Por que estes números são baixos ───────────────────────────────────────
  // Em serverless (Vercel), CADA instância da função tem o seu próprio pool.
  // Com dezenas de instâncias simultâneas, um `max` alto multiplica e estoura
  // o `max_connections` do Postgres (o erro "too many clients already").
  // Por isso mantemos poucas conexões por instância e fechamos as ociosas rápido.
  // Ajustável por env sem novo deploy, mas o padrão já é seguro.
  const max = Number(process.env.PG_POOL_MAX) || 3

  const pool = new Pool({
    connectionString,
    ssl: querSsl ? { rejectUnauthorized: false } : false,
    // Poucas conexões por instância; ainda cobre as queries em paralelo (Promise.all)
    // porque cada página reutiliza e devolve rápido as conexões.
    max,
    // Fecha conexões ociosas em 10s — evita que instâncias "mornas" da Vercel
    // fiquem segurando conexões idle (o que enchia o banco).
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    // Recicla cada conexão após ~5min de vida. Impede que conexões presas em
    // instâncias congeladas fiquem eternamente abertas do lado do Postgres.
    maxLifetimeSeconds: 300,
    // Permite que o pool não segure o event loop, ajudando a Vercel a encerrar
    // instâncias ociosas (e, com elas, as conexões).
    allowExitOnIdle: true,
    // Detecta conexões mortas (derrubadas pela VPS/firewall) mais cedo.
    keepAlive: true,
    // Redes de segurança do lado do servidor: nenhuma query ou transação pode
    // segurar uma conexão indefinidamente. Combate o acúmulo de "idle" e
    // "idle in transaction" que travava o banco.
    statement_timeout: 20_000,
    query_timeout: 20_000,
    idle_in_transaction_session_timeout: 10_000,
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
