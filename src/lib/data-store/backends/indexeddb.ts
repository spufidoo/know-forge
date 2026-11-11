/**
 * Packs + interviews both in IndexedDB (single database).
 */
import type { InterviewSessionRecord } from "@/lib/interview-types"
import type { KnowledgeStore } from "@/lib/types"
import type {
  KnowledgeDataBackend,
  SaveStoreResult,
} from "@/lib/data-store/types"
import {
  emptyStore,
  parseKnowledgeStore,
  saveError,
  toSessionMeta,
} from "@/lib/data-store/shared"

const DB_NAME = "tribal.knowledge.indexeddb.v1"
const DB_VERSION = 1
const PACK_STORE = "pack_store"
const SESSION_STORE = "sessions"
const PACK_KEY = "main"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PACK_STORE)) {
        db.createObjectStore(PACK_STORE)
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        const store = db.createObjectStore(SESSION_STORE, { keyPath: "id" })
        store.createIndex("packId", "packId", { unique: false })
        store.createIndex("updatedAt", "updatedAt", { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB open failed"))
  })
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"))
  })
}

export const indexedDbBackend: KnowledgeDataBackend = {
  id: "indexeddb",
  label: "IndexedDB (packs + interviews)",
  supportsSyncPacks: false,

  async loadStore() {
    if (typeof indexedDB === "undefined") return emptyStore()
    const db = await openDb()
    try {
      const tx = db.transaction(PACK_STORE, "readonly")
      const row = await reqToPromise(tx.objectStore(PACK_STORE).get(PACK_KEY))
      return parseKnowledgeStore(row)
    } finally {
      db.close()
    }
  },

  async saveStore(store: KnowledgeStore): Promise<SaveStoreResult> {
    if (typeof indexedDB === "undefined") {
      return { ok: false, error: "IndexedDB is not available." }
    }
    try {
      const db = await openDb()
      try {
        const tx = db.transaction(PACK_STORE, "readwrite")
        await reqToPromise(tx.objectStore(PACK_STORE).put(store, PACK_KEY))
        return { ok: true }
      } finally {
        db.close()
      }
    } catch (err) {
      return saveError(err, "Could not write IndexedDB pack store.")
    }
  },

  async listInterviewSessions(packId) {
    if (typeof indexedDB === "undefined") return []
    const db = await openDb()
    try {
      const tx = db.transaction(SESSION_STORE, "readonly")
      const index = tx.objectStore(SESSION_STORE).index("packId")
      const rows = await reqToPromise(index.getAll(packId))
      return (rows as InterviewSessionRecord[])
        .map(toSessionMeta)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    } finally {
      db.close()
    }
  },

  async listAllInterviewSessions() {
    if (typeof indexedDB === "undefined") return []
    const db = await openDb()
    try {
      const tx = db.transaction(SESSION_STORE, "readonly")
      const rows = await reqToPromise(tx.objectStore(SESSION_STORE).getAll())
      return ((rows as InterviewSessionRecord[]) ?? []).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )
    } finally {
      db.close()
    }
  },

  async getInterviewSession(id) {
    if (typeof indexedDB === "undefined") return null
    const db = await openDb()
    try {
      const tx = db.transaction(SESSION_STORE, "readonly")
      const row = await reqToPromise(tx.objectStore(SESSION_STORE).get(id))
      return (row as InterviewSessionRecord | undefined) ?? null
    } finally {
      db.close()
    }
  },

  async saveInterviewSession(session) {
    if (typeof indexedDB === "undefined") return
    const db = await openDb()
    try {
      const tx = db.transaction(SESSION_STORE, "readwrite")
      await reqToPromise(tx.objectStore(SESSION_STORE).put(session))
    } finally {
      db.close()
    }
  },

  async deleteInterviewSession(id) {
    if (typeof indexedDB === "undefined") return
    const db = await openDb()
    try {
      const tx = db.transaction(SESSION_STORE, "readwrite")
      await reqToPromise(tx.objectStore(SESSION_STORE).delete(id))
    } finally {
      db.close()
    }
  },
}
