/**
 * Client-side proxy for server SQL backends.
 * All ops go through /api/data-store so browser code never imports native DB drivers.
 *
 * Connection strings are read server-side (process.env) — see ../README.md and
 * ../server/connection-env.ts. Preferred vars per backend id:
 *   postgresql → POSTGRES_URL
 *   mysql      → MYSQL_URL
 *   sqlserver  → MSSQL_CONNECTION_STRING
 *   db2        → DB2_CONNECTION_STRING
 *   db2-zos    → DB2ZOS_CONNECTION_STRING
 *   sqlite     → SQLITE_URL / SQLITE_PATH
 *
 * browser-local, localStorage, and indexeddb need no connection strings.
 */
import type { InterviewSessionRecord } from "@/lib/interview-types"
import type { KnowledgeStore } from "@/lib/types"
import type {
  KnowledgeDataBackend,
  SaveStoreResult,
  StorageBackendId,
} from "@/lib/data-store/types"
import {
  emptyStore,
  sessionToWire,
  toSessionMeta,
  wireToSession,
  type InterviewWire,
} from "@/lib/data-store/shared"

type DataStoreAction =
  | "loadStore"
  | "saveStore"
  | "listInterviewSessions"
  | "listAllInterviewSessions"
  | "getInterviewSession"
  | "saveInterviewSession"
  | "deleteInterviewSession"

async function callApi<T>(
  backend: StorageBackendId,
  action: DataStoreAction,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch("/api/data-store", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ backend, action, ...body }),
    credentials: "same-origin",
    cache: "no-store",
  })
  const json = (await res.json()) as {
    ok?: boolean
    error?: string
    data?: T
  }
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `data-store API failed (${res.status})`)
  }
  return json.data as T
}

export function createHttpRemoteBackend(
  id: StorageBackendId,
  label: string,
): KnowledgeDataBackend {
  return {
    id,
    label,
    supportsSyncPacks: false,

    async loadStore() {
      try {
        return await callApi<KnowledgeStore>(id, "loadStore")
      } catch {
        return emptyStore()
      }
    },

    async saveStore(store): Promise<SaveStoreResult> {
      try {
        return await callApi<SaveStoreResult>(id, "saveStore", { store })
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "saveStore failed",
        }
      }
    },

    async listInterviewSessions(packId) {
      const rows = await callApi<InterviewWire[]>(id, "listInterviewSessions", {
        packId,
      })
      return rows.map((w) => toSessionMeta(wireToSession(w)))
    },

    async listAllInterviewSessions() {
      const rows = await callApi<InterviewWire[]>(
        id,
        "listAllInterviewSessions",
      )
      return rows.map(wireToSession)
    },

    async getInterviewSession(sessionId) {
      const row = await callApi<InterviewWire | null>(
        id,
        "getInterviewSession",
        { sessionId },
      )
      return row ? wireToSession(row) : null
    },

    async saveInterviewSession(session: InterviewSessionRecord) {
      const wire = await sessionToWire(session)
      await callApi(id, "saveInterviewSession", { session: wire })
    },

    async deleteInterviewSession(sessionId) {
      await callApi(id, "deleteInterviewSession", { sessionId })
    },
  }
}

export const db2Backend = createHttpRemoteBackend("db2", "IBM Db2 LUW")
export const postgresqlBackend = createHttpRemoteBackend(
  "postgresql",
  "PostgreSQL",
)
export const sqlServerBackend = createHttpRemoteBackend(
  "sqlserver",
  "Microsoft SQL Server",
)
export const db2ZosBackend = createHttpRemoteBackend(
  "db2-zos",
  "Db2 for z/OS (mainframe)",
)
export const mysqlBackend = createHttpRemoteBackend("mysql", "MySQL")
export const sqliteBackend = createHttpRemoteBackend("sqlite", "SQLite")
