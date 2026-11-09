"use client"

import { useCallback, useEffect, useState } from "react"
import { createSamplePack } from "@/lib/sample-pack"
import {
  loadStore,
  removePack,
  saveStore,
  upsertPack,
} from "@/lib/storage"
import type { KnowledgePack } from "@/lib/types"

export function useKnowledgeStore() {
  const [packs, setPacks] = useState<KnowledgePack[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPacks(loadStore().packs)
      setReady(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!ready) return
    saveStore({ version: 1, packs })
  }, [packs, ready])

  const savePack = useCallback((pack: KnowledgePack) => {
    const stamped = { ...pack, updatedAt: new Date().toISOString() }
    setPacks((prev) => upsertPack(prev, stamped))
    return stamped
  }, [])

  const deletePack = useCallback((id: string) => {
    setPacks((prev) => removePack(prev, id))
  }, [])

  const addSample = useCallback(() => {
    const sample = createSamplePack()
    setPacks((prev) => upsertPack(prev, sample))
    return sample
  }, [])

  const importPack = useCallback((pack: KnowledgePack) => {
    const stamped: KnowledgePack = {
      ...pack,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    }
    setPacks((prev) => upsertPack(prev, stamped))
    return stamped
  }, [])

  const getPack = useCallback(
    (id: string) => packs.find((p) => p.id === id),
    [packs],
  )

  return {
    packs,
    ready,
    savePack,
    deletePack,
    addSample,
    importPack,
    getPack,
  }
}
