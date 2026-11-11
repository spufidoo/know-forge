import { buildDb2CliString } from "@/lib/data-store/server/connection-env"
import type { SqlDriver, SqlRow } from "@/lib/data-store/server/sql-driver"
import type { StorageBackendId } from "@/lib/data-store/types"

type IbmDbConn = {
  query: (
    sql: string,
    params: unknown[],
    cb: (err: Error | null, result: SqlRow[]) => void,
  ) => void
  prepare: (
    sql: string,
    cb: (
      err: Error | null,
      stmt: {
        executeNonQuery: (
          params: unknown[],
          cb: (err: Error | null) => void,
        ) => void
        close: (cb?: () => void) => void
      },
    ) => void,
  ) => void
  close: (cb?: () => void) => void
}

type IbmDb = {
  open: (
    connStr: string,
    cb: (err: Error | null, conn: IbmDbConn) => void,
  ) => void
}

const cache = new Map<string, SqlDriver>()

function connString(kind: "db2" | "db2-zos"): string {
  return buildDb2CliString(kind)
}

function openConn(ibm: IbmDb, cs: string): Promise<IbmDbConn> {
  return new Promise((resolve, reject) => {
    ibm.open(cs, (err, conn) => {
      if (err) reject(err)
      else resolve(conn)
    })
  })
}

function queryConn(
  conn: IbmDbConn,
  sql: string,
  params: unknown[],
): Promise<SqlRow[]> {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, result) => {
      if (err) reject(err)
      else resolve(result || [])
    })
  })
}

function execConn(
  conn: IbmDbConn,
  sql: string,
  params: unknown[],
): Promise<void> {
  if (params.length === 0) {
    return queryConn(conn, sql, []).then(() => undefined)
  }
  return new Promise((resolve, reject) => {
    conn.prepare(sql, (err, stmt) => {
      if (err) {
        reject(err)
        return
      }
      stmt.executeNonQuery(params, (execErr) => {
        stmt.close()
        if (execErr) reject(execErr)
        else resolve()
      })
    })
  })
}

export async function createDb2Driver(
  backendId: Extract<StorageBackendId, "db2" | "db2-zos">,
): Promise<SqlDriver> {
  const cached = cache.get(backendId)
  if (cached) return cached

  let ibm: IbmDb
  try {
    ibm = (await import("ibm_db")) as unknown as IbmDb & {
      default?: IbmDb
    }
    if (!("open" in ibm) && (ibm as { default?: IbmDb }).default) {
      ibm = (ibm as { default: IbmDb }).default
    }
  } catch {
    throw new Error(
      'Db2 backends require the "ibm_db" package and IBM CLI driver. Run: npm install ibm_db',
    )
  }

  const kind = backendId === "db2-zos" ? "db2-zos" : "db2"
  const cs = connString(kind)
  let conn = await openConn(ibm, cs)

  const driver: SqlDriver = {
    dialect: "db2",
    async ensureSchema() {},
    async query<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []) {
      try {
        return (await queryConn(conn, sql, params)) as T[]
      } catch (err) {
        // Reconnect once on stale connection
        conn.close?.()
        conn = await openConn(ibm, cs)
        return (await queryConn(conn, sql, params)) as T[]
      }
    },
    async execute(sql: string, params: unknown[] = []) {
      try {
        await execConn(conn, sql, params)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (/SQL0601N|already exists/i.test(msg)) return
        conn.close?.()
        conn = await openConn(ibm, cs)
        await execConn(conn, sql, params)
      }
    },
    async close() {
      conn.close?.()
      cache.delete(backendId)
    },
  }

  cache.set(backendId, driver)
  return driver
}
