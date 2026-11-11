import { resolvePostgresConnectionString } from "@/lib/data-store/server/connection-env"
import type { SqlDriver, SqlRow } from "@/lib/data-store/server/sql-driver"

type PgPool = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: SqlRow[] }>
  end: () => Promise<void>
}

let cached: SqlDriver | null = null
let pool: PgPool | null = null

export async function createPostgresqlDriver(): Promise<SqlDriver> {
  if (cached) return cached

  let Pool: new (config?: Record<string, unknown>) => PgPool
  try {
    const mod = (await import("pg")) as unknown as {
      Pool: new (config?: Record<string, unknown>) => PgPool
      default?: { Pool: new (config?: Record<string, unknown>) => PgPool }
    }
    Pool = mod.Pool ?? mod.default?.Pool!
  } catch {
    throw new Error(
      'PostgreSQL backend requires the "pg" package. Run: npm install pg',
    )
  }

  const connectionString = resolvePostgresConnectionString()
  if (!connectionString && !process.env.PGHOST) {
    throw new Error(
      "PostgreSQL: set POSTGRES_URL (or POSTGRESQL_URL / DATABASE_URL / PGHOST+PG*).",
    )
  }

  pool = connectionString
    ? new Pool({ connectionString })
    : new Pool({
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      })

  cached = {
    dialect: "postgres",
    async ensureSchema() {},
    async query<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []) {
      const res = await pool!.query(sql, params)
      return res.rows as T[]
    },
    async execute(sql: string, params: unknown[] = []) {
      await pool!.query(sql, params)
    },
    async close() {
      await pool?.end()
      pool = null
      cached = null
    },
  }
  return cached
}
