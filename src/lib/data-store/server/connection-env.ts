/**
 * Server-side connection resolution for SQL knowledge backends.
 * Browser backends (browser-local, localStorage, indexeddb) need no env.
 *
 * Preferred names (first match wins) — see ../README.md for the full table.
 */
import path from "node:path"

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]
    if (value != null && String(value).trim() !== "") {
      return String(value).trim()
    }
  }
  return undefined
}

function stripFileUrl(url: string): string {
  if (url.startsWith("file:")) {
    return url.replace(/^file:\/\//, "").replace(/^file:/, "")
  }
  return url
}

/** PostgreSQL: POSTGRES_URL | POSTGRESQL_URL | DATABASE_URL | KNOWLEDGE_DATABASE_URL */
export function resolvePostgresConnectionString(): string | undefined {
  return firstEnv(
    "POSTGRES_URL",
    "POSTGRESQL_URL",
    "POSTGRES_CONNECTION_STRING",
    "KNOWLEDGE_DATABASE_URL",
    "DATABASE_URL",
  )
}

/** MySQL: MYSQL_URL | MYSQL_CONNECTION_STRING | DATABASE_URL (mysql://…) */
export function resolveMysqlConnectionString(): string | undefined {
  const url = firstEnv(
    "MYSQL_URL",
    "MYSQL_CONNECTION_STRING",
    "KNOWLEDGE_MYSQL_URL",
  )
  if (url) return url
  const databaseUrl = firstEnv("DATABASE_URL")
  if (databaseUrl && /^mysql(\+[^:]+)?:\/\//i.test(databaseUrl)) {
    return databaseUrl
  }
  return undefined
}

/**
 * SQL Server: MSSQL_CONNECTION_STRING | SQLSERVER_URL | DATABASE_URL (sqlserver:// / mssql://)
 * Also accepts discrete host vars when no URL is set.
 */
export function resolveSqlServerConnectionString(): string | undefined {
  const url = firstEnv(
    "MSSQL_CONNECTION_STRING",
    "SQLSERVER_URL",
    "SQLSERVER_CONNECTION_STRING",
    "KNOWLEDGE_MSSQL_URL",
  )
  if (url) return url
  const databaseUrl = firstEnv("DATABASE_URL")
  if (
    databaseUrl &&
    /^(sqlserver|mssql|jdbc:sqlserver):\/\//i.test(databaseUrl)
  ) {
    return databaseUrl
  }
  return undefined
}

/** Db2 LUW: DB2_CONNECTION_STRING | DB2_URL | KNOWLEDGE_DB2_CONNECTION_STRING */
export function resolveDb2ConnectionString(): string | undefined {
  return firstEnv(
    "DB2_CONNECTION_STRING",
    "DB2_URL",
    "KNOWLEDGE_DB2_CONNECTION_STRING",
    "KNOWLEDGE_DB2_URL",
  )
}

/** Db2 z/OS: DB2ZOS_CONNECTION_STRING | DB2_ZOS_CONNECTION_STRING | … */
export function resolveDb2ZosConnectionString(): string | undefined {
  return firstEnv(
    "DB2ZOS_CONNECTION_STRING",
    "DB2_ZOS_CONNECTION_STRING",
    "DB2ZOS_URL",
    "KNOWLEDGE_DB2ZOS_CONNECTION_STRING",
    "KNOWLEDGE_DB2ZOS_URL",
  )
}

/**
 * SQLite path: SQLITE_URL | SQLITE_PATH | DATABASE_URL (file:… / *.sqlite)
 * Defaults to data/ke-studio.sqlite under cwd.
 */
export function resolveSqlitePath(): string {
  const url = firstEnv(
    "SQLITE_URL",
    "SQLITE_PATH",
    "SQLITE_CONNECTION_STRING",
    "KNOWLEDGE_SQLITE_PATH",
    "KNOWLEDGE_SQLITE_URL",
  )
  if (url) return path.resolve(stripFileUrl(url))

  const databaseUrl = firstEnv("DATABASE_URL")
  if (
    databaseUrl &&
    (databaseUrl.startsWith("file:") ||
      /\.sqlite3?$/i.test(databaseUrl) ||
      databaseUrl.startsWith("sqlite:"))
  ) {
    return path.resolve(
      stripFileUrl(databaseUrl.replace(/^sqlite:/i, "file:")),
    )
  }

  return path.join(process.cwd(), "data", "ke-studio.sqlite")
}

/** Build a classic IBM CLI connection string from discrete DB2_* parts. */
export function buildDb2CliString(kind: "db2" | "db2-zos"): string {
  if (kind === "db2-zos") {
    const fromUrl = resolveDb2ZosConnectionString()
    if (fromUrl) return fromUrl
    const host = firstEnv("DB2ZOS_HOST", "KNOWLEDGE_DB2ZOS_HOST")
    const database = firstEnv("DB2ZOS_DATABASE", "KNOWLEDGE_DB2ZOS_DATABASE")
    const uid = firstEnv("DB2ZOS_UID", "KNOWLEDGE_DB2ZOS_UID")
    const pwd = firstEnv("DB2ZOS_PWD", "KNOWLEDGE_DB2ZOS_PWD")
    const port = firstEnv("DB2ZOS_PORT", "KNOWLEDGE_DB2ZOS_PORT") || "446"
    if (!host || !database || !uid || !pwd) {
      throw new Error(
        "Db2 z/OS: set DB2ZOS_CONNECTION_STRING (or DB2ZOS_HOST/DATABASE/UID/PWD).",
      )
    }
    return `DATABASE=${database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${uid};PWD=${pwd};`
  }

  const fromUrl = resolveDb2ConnectionString()
  if (fromUrl) return fromUrl
  const database =
    firstEnv("DB2_DATABASE", "KNOWLEDGE_DB2_DATABASE") || "KESTUDIO"
  const host = firstEnv("DB2_HOST", "KNOWLEDGE_DB2_HOST") || "127.0.0.1"
  const port = firstEnv("DB2_PORT", "KNOWLEDGE_DB2_PORT") || "25000"
  const uid = firstEnv("DB2_UID", "KNOWLEDGE_DB2_UID")
  const pwd = firstEnv("DB2_PWD", "KNOWLEDGE_DB2_PWD")
  if (!uid || !pwd) {
    throw new Error(
      "Db2 LUW: set DB2_CONNECTION_STRING (or DB2_UID + DB2_PWD; DB defaults to KESTUDIO).",
    )
  }
  return `DATABASE=${database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${uid};PWD=${pwd};`
}
