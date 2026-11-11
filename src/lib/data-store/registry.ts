import { browserLocalBackend } from "@/lib/data-store/backends/browser-local"
import { localStorageBackend } from "@/lib/data-store/backends/localStorage"
import { indexedDbBackend } from "@/lib/data-store/backends/indexeddb"
import {
  db2Backend,
  db2ZosBackend,
  mysqlBackend,
  postgresqlBackend,
  sqlServerBackend,
  sqliteBackend,
} from "@/lib/data-store/backends/http-remote"
import type {
  BackendDescriptor,
  KnowledgeDataBackend,
  StorageBackendId,
} from "@/lib/data-store/types"

const backends = new Map<StorageBackendId, KnowledgeDataBackend>()

function register(backend: KnowledgeDataBackend) {
  backends.set(backend.id, backend)
}

register(browserLocalBackend)
register(localStorageBackend)
register(indexedDbBackend)
register(db2Backend)
register(postgresqlBackend)
register(sqlServerBackend)
register(db2ZosBackend)
register(mysqlBackend)
register(sqliteBackend)

const DEFAULT_BACKEND: StorageBackendId = "browser-local"

let activeId: StorageBackendId = resolveInitialBackendId()

function resolveInitialBackendId(): StorageBackendId {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND
      : undefined
  if (fromEnv && backends.has(fromEnv as StorageBackendId)) {
    return fromEnv as StorageBackendId
  }
  return DEFAULT_BACKEND
}

const NOTES: Record<StorageBackendId, string> = {
  "browser-local":
    "Default: packs in localStorage (tribal.knowledge-store.v1), interviews in IndexedDB (tribal.interviews.v1).",
  localStorage:
    "Packs + interviews in localStorage (audio as base64; watch browser quota).",
  indexeddb: "Packs + interviews in IndexedDB tribal.knowledge.indexeddb.v1.",
  db2: "IBM Db2 LUW via /api/data-store + ibm_db. Set KNOWLEDGE_DB2_* env.",
  postgresql:
    "PostgreSQL via /api/data-store + pg. Set KNOWLEDGE_DATABASE_URL or PG*.",
  sqlserver:
    "SQL Server via /api/data-store + mssql. Set KNOWLEDGE_MSSQL_*.",
  "db2-zos":
    "Db2 for z/OS via /api/data-store + ibm_db. Set KNOWLEDGE_DB2ZOS_*.",
  mysql: "MySQL via /api/data-store + mysql2. Set KNOWLEDGE_MYSQL_*.",
  sqlite:
    "SQLite file via /api/data-store + better-sqlite3 (data/ke-studio.sqlite).",
}

export function listStorageBackends(): BackendDescriptor[] {
  return [...backends.values()].map((b) => ({
    id: b.id,
    label: b.label,
    available: true,
    notes: NOTES[b.id],
  }))
}

export function getActiveStorageBackendId(): StorageBackendId {
  return activeId
}

export function getActiveStorageBackend(): KnowledgeDataBackend {
  return backends.get(activeId) ?? browserLocalBackend
}

/**
 * Switch the in-memory active backend for this runtime.
 * Prefer NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND for process-wide default.
 */
export function setActiveStorageBackend(
  id: StorageBackendId,
): KnowledgeDataBackend {
  if (!backends.has(id)) {
    throw new Error(`Unknown storage backend: ${id}`)
  }
  activeId = id
  return getActiveStorageBackend()
}

export function getStorageBackend(id: StorageBackendId): KnowledgeDataBackend {
  const backend = backends.get(id)
  if (!backend) throw new Error(`Unknown storage backend: ${id}`)
  return backend
}
