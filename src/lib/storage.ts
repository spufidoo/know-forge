import type { KnowledgePack, KnowledgeStore } from "./types"

const STORAGE_KEY = "tribal.knowledge-store.v1"

export function loadStore(): KnowledgeStore {
  if (typeof window === "undefined") {
    return { version: 1, packs: [] }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 1, packs: [] }
    const parsed = JSON.parse(raw) as KnowledgeStore
    if (parsed?.version !== 1 || !Array.isArray(parsed.packs)) {
      return { version: 1, packs: [] }
    }
    return parsed
  } catch {
    return { version: 1, packs: [] }
  }
}

export function saveStore(store: KnowledgeStore) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function upsertPack(packs: KnowledgePack[], pack: KnowledgePack) {
  const idx = packs.findIndex((p) => p.id === pack.id)
  if (idx === -1) return [pack, ...packs]
  const next = packs.slice()
  next[idx] = pack
  return next
}

export function removePack(packs: KnowledgePack[], id: string) {
  return packs.filter((p) => p.id !== id)
}
