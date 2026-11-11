/**
 * Default backend: knowledge packs in localStorage, interview blobs in IndexedDB.
 * Keys match the pre-abstraction store (do not rename without a migration).
 */
import type {
  InterviewSessionMeta,
  InterviewSessionRecord,
} from "@/lib/interview-types"
import type { KnowledgeStore } from "@/lib/types"
import type {
  KnowledgeDataBackend,
  SaveStoreResult,
} from "@/lib/data-store/types"

export const PACK_STORAGE_KEY = "tribal.knowledge-store.v1"
const IDB_NAME = "tribal.interviews.v1"
const IDB_VERSION = 1
const IDB_STORE = "sessions"

function emptyStore(): KnowledgeStore {
  return { version: 1, packs: [] }
}

function loadPacksSync(): KnowledgeStore {
  if (typeof window === "undefined") return emptyStore()
  try {
    const raw = window.localStorage.getItem(PACK_STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as KnowledgeStore
    if (parsed?.version !== 1 || !Array.isArray(parsed.packs)) {
      return emptyStore()
    }
    return parsed
  } catch {
    return emptyStore()
  }
}

function savePacksSync(store: KnowledgeStore): SaveStoreResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Not in a browser context." }
  }
  try {
    window.localStorage.setItem(PACK_STORAGE_KEY, JSON.stringify(store))
    return { ok: true }
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === "QuotaExceededError"
        ? "Browser storage is full — pack was not written."
        : err instanceof Error
          ? err.message
          : "Could not write pack store."
    return { ok: false, error: message }
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: "id" })
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

function toMeta(row: InterviewSessionRecord): InterviewSessionMeta {
  return {
    id: row.id,
    packId: row.packId,
    title: row.title,
    expertName: row.expertName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    durationMs: row.durationMs,
    status: row.status,
    mimeType: row.mimeType,
    hasAudio: Boolean(row.audioBlob) || row.hasAudio,
    transcript: row.transcript,
    candidates: row.candidates,
  }
}

export const browserLocalBackend: KnowledgeDataBackend = {
  id: "browser-local",
  label: "Browser localStorage + IndexedDB",
  supportsSyncPacks: true,

  loadStoreSync: loadPacksSync,
  saveStoreSync: savePacksSync,

  async loadStore() {
    return loadPacksSync()
  },

  async saveStore(store) {
    return savePacksSync(store)
  },

  async listInterviewSessions(packId) {
    if (typeof indexedDB === "undefined") return []
    const db = await openDb()
    try {
      const tx = db.transaction(IDB_STORE, "readonly")
      const index = tx.objectStore(IDB_STORE).index("packId")
      const rows = await reqToPromise(index.getAll(packId))
      return (rows as InterviewSessionRecord[])
        .map(toMeta)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    } finally {
      db.close()
    }
  },

  async listAllInterviewSessions() {
    if (typeof indexedDB === "undefined") return []
    const db = await openDb()
    try {
      const tx = db.transaction(IDB_STORE, "readonly")
      const rows = await reqToPromise(tx.objectStore(IDB_STORE).getAll())
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
      const tx = db.transaction(IDB_STORE, "readonly")
      const row = await reqToPromise(tx.objectStore(IDB_STORE).get(id))
      return (row as InterviewSessionRecord | undefined) ?? null
    } finally {
      db.close()
    }
  },

  async saveInterviewSession(session) {
    if (typeof indexedDB === "undefined") return
    const db = await openDb()
    try {
      const tx = db.transaction(IDB_STORE, "readwrite")
      await reqToPromise(tx.objectStore(IDB_STORE).put(session))
    } finally {
      db.close()
    }
  },

  async deleteInterviewSession(id) {
    if (typeof indexedDB === "undefined") return
    const db = await openDb()
    try {
      const tx = db.transaction(IDB_STORE, "readwrite")
      await reqToPromise(tx.objectStore(IDB_STORE).delete(id))
    } finally {
      db.close()
    }
  },
}
