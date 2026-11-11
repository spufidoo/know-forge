import { resolveMysqlConnectionString } from "@/lib/data-store/server/connection-env"
import type { SqlDriver, SqlRow } from "@/lib/data-store/server/sql-driver"

type MysqlPool = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<[SqlRow[], unknown]>
  end: () => Promise<void>
}

let cached: SqlDriver | null = null
let pool: MysqlPool | null = null

export async function createMysqlDriver(): Promise<SqlDriver> {
  if (cached) return cached

  let createPool: (config: Record<string, unknown>) => MysqlPool
  try {
    const mod = (await import("mysql2/promise")) as unknown as {
      createPool: (config: Record<string, unknown>) => MysqlPool
      default?: { createPool: (config: Record<string, unknown>) => MysqlPool }
    }
    createPool = mod.createPool ?? mod.default!.createPool
  } catch {
    throw new Error(
      'MySQL backend requires the "mysql2" package. Run: npm install mysql2',
    )
  }

  const uri = resolveMysqlConnectionString()
  if (uri) {
    pool = createPool({
      uri,
      waitForConnections: true,
      connectionLimit: 4,
    })
  } else {
    const host = process.env.MYSQL_HOST || process.env.KNOWLEDGE_MYSQL_HOST
    const database =
      process.env.MYSQL_DATABASE || process.env.KNOWLEDGE_MYSQL_DATABASE
    if (!host || !database) {
      throw new Error(
        "MySQL: set MYSQL_URL (or MYSQL_HOST + MYSQL_DATABASE).",
      )
    }
    pool = createPool({
      host,
      port: Number(
        process.env.MYSQL_PORT || process.env.KNOWLEDGE_MYSQL_PORT || 3306,
      ),
      user: process.env.MYSQL_USER || process.env.KNOWLEDGE_MYSQL_USER,
      password:
        process.env.MYSQL_PASSWORD || process.env.KNOWLEDGE_MYSQL_PASSWORD,
      database,
      waitForConnections: true,
      connectionLimit: 4,
    })
  }

  cached = {
    dialect: "mysql",
    async ensureSchema() {},
    async query<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []) {
      const [rows] = await pool!.query(sql, params)
      return rows as T[]
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
