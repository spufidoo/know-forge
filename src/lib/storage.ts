/**
 * @deprecated Prefer `@/lib/data-store` — kept as a compatibility façade.
 * Pack persistence now routes through the active KnowledgeDataBackend
 * (default: browser-local → tribal.knowledge-store.v1 in localStorage).
 */
export {
  loadStore,
  saveStore,
  loadStoreAsync,
  saveStoreAsync,
  upsertPack,
  removePack,
  type SaveStoreResult,
} from "@/lib/data-store"
