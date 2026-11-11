import type {
  InterviewSessionMeta,
  InterviewSessionRecord,
} from "@/lib/interview-types"
import type { KnowledgeStore } from "@/lib/types"

/** Pluggable backends for knowledge packs + interview media. */
export type StorageBackendId =
  | "browser-local"
  | "localStorage"
  | "indexeddb"
  | "db2"
  | "postgresql"
  | "sqlserver"
  | "db2-zos"
  | "mysql"
  | "sqlite"

export type SaveStoreResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * One interface for every storage backend.
 * Packs + interview audio/transcript/candidates share this contract.
 */
export interface KnowledgeDataBackend {
  readonly id: StorageBackendId
  readonly label: string
  /** True when pack load/save can run synchronously (browser defaults). */
  readonly supportsSyncPacks: boolean

  loadStore(): Promise<KnowledgeStore>
  saveStore(store: KnowledgeStore): Promise<SaveStoreResult>

  /** Optional sync path for React init / setState; only on browser backends. */
  loadStoreSync?(): KnowledgeStore
  saveStoreSync?(store: KnowledgeStore): SaveStoreResult

  listInterviewSessions(packId: string): Promise<InterviewSessionMeta[]>
  /** All sessions (admin / migration helpers). */
  listAllInterviewSessions(): Promise<InterviewSessionRecord[]>
  getInterviewSession(id: string): Promise<InterviewSessionRecord | null>
  saveInterviewSession(session: InterviewSessionRecord): Promise<void>
  deleteInterviewSession(id: string): Promise<void>
}

export type BackendDescriptor = {
  id: StorageBackendId
  label: string
  /** Implemented and selectable as active backend. */
  available: boolean
  notes?: string
}
