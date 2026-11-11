/**
 * Packs + interviews entirely in localStorage.
 * Interview audio is stored as base64 (subject to browser quota).
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
  sessionToWire,
  toSessionMeta,
  wireToSession,
  type InterviewWire,
} from "@/lib/data-store/shared"

const PACK_KEY = "tribal.knowledge-store.localStorage.v1"
const SESSIONS_KEY = "tribal.interviews.localStorage.v1"

function loadPacksSync(): KnowledgeStore {
  if (typeof window === "undefined") return emptyStore()
  try {
    const raw = window.localStorage.getItem(PACK_KEY)
    if (!raw) return emptyStore()
    return parseKnowledgeStore(JSON.parse(raw))
  } catch {
    return emptyStore()
  }
}

function savePacksSync(store: KnowledgeStore): SaveStoreResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Not in a browser context." }
  }
  try {
    window.localStorage.setItem(PACK_KEY, JSON.stringify(store))
    return { ok: true }
  } catch (err) {
    return saveError(err, "Could not write pack store.")
  }
}

function readSessionWires(): InterviewWire[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as InterviewWire[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSessionWires(rows: InterviewWire[]): void {
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(rows))
}

export const localStorageBackend: KnowledgeDataBackend = {
  id: "localStorage",
  label: "localStorage (packs + interviews)",
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
    return readSessionWires()
      .filter((s) => s.packId === packId)
      .map((w) => toSessionMeta(wireToSession(w)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async listAllInterviewSessions() {
    return readSessionWires()
      .map(wireToSession)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async getInterviewSession(id) {
    const wire = readSessionWires().find((s) => s.id === id)
    return wire ? wireToSession(wire) : null
  },

  async saveInterviewSession(session: InterviewSessionRecord) {
    if (typeof window === "undefined") return
    const wire = await sessionToWire(session)
    const rows = readSessionWires().filter((s) => s.id !== session.id)
    rows.push(wire)
    writeSessionWires(rows)
  },

  async deleteInterviewSession(id) {
    if (typeof window === "undefined") return
    writeSessionWires(readSessionWires().filter((s) => s.id !== id))
  },
}
