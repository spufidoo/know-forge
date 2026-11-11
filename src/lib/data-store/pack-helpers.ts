import type { KnowledgePack } from "@/lib/types"

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
