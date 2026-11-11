/**
 * Swappable knowledge + interview storage.
 *
 * Default backend: browser-local (localStorage packs + IndexedDB interviews).
 * Select via NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND or setActiveStorageBackend().
 */
import { getActiveStorageBackend } from "@/lib/data-store/registry"
import { emptyStore } from "@/lib/data-store/shared"
import type { KnowledgeStore } from "@/lib/types"
import type { SaveStoreResult } from "@/lib/data-store/types"

export type {
  BackendDescriptor,
  KnowledgeDataBackend,
  SaveStoreResult,
  StorageBackendId,
} from "@/lib/data-store/types"

export {
  getActiveStorageBackend,
  getActiveStorageBackendId,
  getStorageBackend,
  listStorageBackends,
  setActiveStorageBackend,
} from "@/lib/data-store/registry"

export { upsertPack, removePack } from "@/lib/data-store/pack-helpers"
export { PACK_STORAGE_KEY } from "@/lib/data-store/backends/browser-local"

/**
 * Sync pack load when the active backend supports it (browser-local / localStorage).
 * Async backends return an empty store here — use loadStoreAsync() / the provider hydrate.
 */
export function loadStore(): KnowledgeStore {
  const backend = getActiveStorageBackend()
  if (backend.loadStoreSync) return backend.loadStoreSync()
  return emptyStore()
}

/** Sync pack save when supported; otherwise returns an error pointing at saveStoreAsync. */
export function saveStore(store: KnowledgeStore): SaveStoreResult {
  const backend = getActiveStorageBackend()
  if (backend.saveStoreSync) return backend.saveStoreSync(store)
  return {
    ok: false,
    error: `Backend "${backend.id}" requires saveStoreAsync().`,
  }
}

export async function loadStoreAsync(): Promise<KnowledgeStore> {
  return getActiveStorageBackend().loadStore()
}

export async function saveStoreAsync(
  store: KnowledgeStore,
): Promise<SaveStoreResult> {
  return getActiveStorageBackend().saveStore(store)
}

export async function listInterviewSessions(packId: string) {
  return getActiveStorageBackend().listInterviewSessions(packId)
}

export async function listAllInterviewSessions() {
  return getActiveStorageBackend().listAllInterviewSessions()
}

export async function getInterviewSession(id: string) {
  return getActiveStorageBackend().getInterviewSession(id)
}

export async function saveInterviewSession(
  session: import("@/lib/interview-types").InterviewSessionRecord,
) {
  return getActiveStorageBackend().saveInterviewSession(session)
}

export async function deleteInterviewSession(id: string) {
  return getActiveStorageBackend().deleteInterviewSession(id)
}
