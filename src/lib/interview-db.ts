import type { InterviewSessionMeta, InterviewSessionRecord } from "./interview-types"

const DB_NAME = "tribal.interviews.v1"
const DB_VERSION = 1
const STORE = "sessions"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex("packId", "packId", { unique: false })
        store.createIndex("updatedAt", "updatedAt", { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"))
  })
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"))
  })
}

export async function listInterviewSessions(
  packId: string,
): Promise<InterviewSessionMeta[]> {
  if (typeof indexedDB === "undefined") return []
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, "readonly")
    const index = tx.objectStore(STORE).index("packId")
    const rows = await reqToPromise(index.getAll(packId))
    return (rows as InterviewSessionRecord[])
      .map(toMeta)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } finally {
    db.close()
  }
}

export async function getInterviewSession(
  id: string,
): Promise<InterviewSessionRecord | null> {
  if (typeof indexedDB === "undefined") return null
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, "readonly")
    const row = await reqToPromise(tx.objectStore(STORE).get(id))
    return (row as InterviewSessionRecord | undefined) ?? null
  } finally {
    db.close()
  }
}

export async function saveInterviewSession(
  session: InterviewSessionRecord,
): Promise<void> {
  if (typeof indexedDB === "undefined") return
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, "readwrite")
    await reqToPromise(tx.objectStore(STORE).put(session))
  } finally {
    db.close()
  }
}

export async function deleteInterviewSession(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, "readwrite")
    await reqToPromise(tx.objectStore(STORE).delete(id))
  } finally {
    db.close()
  }
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

export function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
