import { resolveSqlServerConnectionString } from "@/lib/data-store/server/connection-env"
import type { SqlDriver, SqlRow } from "@/lib/data-store/server/sql-driver"

type MssqlPool = {
  request: () => {
    input: (name: string, value: unknown) => unknown
    query: (sql: string) => Promise<{ recordset: SqlRow[] }>
  }
  close: () => Promise<void>
}

let cached: SqlDriver | null = null
let pool: MssqlPool | null = null

export async function createMssqlDriver(): Promise<SqlDriver> {
  if (cached) return cached

  let sql: {
    connect: (config: string | Record<string, unknown>) => Promise<MssqlPool>
  }
  try {
    sql = (await import("mssql")) as unknown as {
      connect: (config: string | Record<string, unknown>) => Promise<MssqlPool>
      default?: {
        connect: (
          config: string | Record<string, unknown>,
        ) => Promise<MssqlPool>
      }
    }
    if (!sql.connect && sql.default) sql = sql.default as typeof sql
  } catch {
    throw new Error(
      'SQL Server backend requires the "mssql" package. Run: npm install mssql',
    )
  }

  const connectionString = resolveSqlServerConnectionString()
  if (connectionString) {
    pool = await sql.connect(connectionString)
  } else {
    const server =
      process.env.MSSQL_SERVER ||
      process.env.SQLSERVER_HOST ||
      process.env.KNOWLEDGE_MSSQL_SERVER
    const database =
      process.env.MSSQL_DATABASE ||
      process.env.SQLSERVER_DATABASE ||
      process.env.KNOWLEDGE_MSSQL_DATABASE
    if (!server || !database) {
      throw new Error(
        "SQL Server: set MSSQL_CONNECTION_STRING (or MSSQL_SERVER + MSSQL_DATABASE).",
      )
    }
    pool = await sql.connect({
      server,
      port: Number(
        process.env.MSSQL_PORT ||
          process.env.SQLSERVER_PORT ||
          process.env.KNOWLEDGE_MSSQL_PORT ||
          1433,
      ),
      user:
        process.env.MSSQL_USER ||
        process.env.SQLSERVER_USER ||
        process.env.KNOWLEDGE_MSSQL_USER,
      password:
        process.env.MSSQL_PASSWORD ||
        process.env.SQLSERVER_PASSWORD ||
        process.env.KNOWLEDGE_MSSQL_PASSWORD,
      database,
      options: {
        encrypt:
          (process.env.MSSQL_ENCRYPT || process.env.KNOWLEDGE_MSSQL_ENCRYPT) !==
          "false",
        trustServerCertificate:
          (process.env.MSSQL_TRUST_CERT ||
            process.env.KNOWLEDGE_MSSQL_TRUST_CERT) === "true",
      },
    })
  }

  cached = {
    dialect: "mssql",
    async ensureSchema() {},
    async query<T extends SqlRow = SqlRow>(
      sqlText: string,
      params: unknown[] = [],
    ) {
      const req = pool!.request()
      params.forEach((value, i) => {
        req.input(`p${i + 1}`, value)
      })
      const result = await req.query(sqlText)
      return result.recordset as T[]
    },
    async execute(sqlText: string, params: unknown[] = []) {
      const req = pool!.request()
      params.forEach((value, i) => {
        req.input(`p${i + 1}`, value)
      })
      await req.query(sqlText)
    },
    async close() {
      await pool?.close()
      pool = null
      cached = null
    },
  }
  return cached
}
