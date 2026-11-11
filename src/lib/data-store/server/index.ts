import "server-only"

import type { KnowledgeDataBackend, StorageBackendId } from "@/lib/data-store/types"
import { createSqlJsonBackend } from "@/lib/data-store/server/sql-json-store"
import { createSqliteDriver } from "@/lib/data-store/server/drivers/sqlite"
import { createPostgresqlDriver } from "@/lib/data-store/server/drivers/postgresql"
import { createMysqlDriver } from "@/lib/data-store/server/drivers/mysql"
import { createMssqlDriver } from "@/lib/data-store/server/drivers/mssql"
import { createDb2Driver } from "@/lib/data-store/server/drivers/db2"

const SQL_BACKENDS = new Set<StorageBackendId>([
  "db2",
  "postgresql",
  "sqlserver",
  "db2-zos",
  "mysql",
  "sqlite",
])

export function isServerSqlBackendId(
  id: string,
): id is Extract<
  StorageBackendId,
  "db2" | "postgresql" | "sqlserver" | "db2-zos" | "mysql" | "sqlite"
> {
  return SQL_BACKENDS.has(id as StorageBackendId)
}

export async function getServerSqlBackend(
  id: StorageBackendId,
): Promise<KnowledgeDataBackend> {
  switch (id) {
    case "sqlite":
      return createSqlJsonBackend(
        "sqlite",
        "SQLite",
        await createSqliteDriver(),
      )
    case "postgresql":
      return createSqlJsonBackend(
        "postgresql",
        "PostgreSQL",
        await createPostgresqlDriver(),
      )
    case "mysql":
      return createSqlJsonBackend("mysql", "MySQL", await createMysqlDriver())
    case "sqlserver":
      return createSqlJsonBackend(
        "sqlserver",
        "Microsoft SQL Server",
        await createMssqlDriver(),
      )
    case "db2":
      return createSqlJsonBackend(
        "db2",
        "IBM Db2 LUW",
        await createDb2Driver("db2"),
      )
    case "db2-zos":
      return createSqlJsonBackend(
        "db2-zos",
        "Db2 for z/OS (mainframe)",
        await createDb2Driver("db2-zos"),
      )
    default:
      throw new Error(`No server SQL backend for "${id}"`)
  }
}
