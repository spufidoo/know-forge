"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createSamplePack } from "@/lib/sample-pack"
import {
  getActiveStorageBackend,
  loadStore,
  loadStoreAsync,
  removePack,
  saveStore,
  saveStoreAsync,
  upsertPack,
} from "@/lib/data-store"
import type { KnowledgePack } from "@/lib/types"
import type { SaveStoreResult } from "@/lib/data-store"

type KnowledgeStoreApi = {
  packs: KnowledgePack[]
  ready: boolean
  savePack: (pack: KnowledgePack) => KnowledgePack
  deletePack: (id: string) => void
  addSample: () => KnowledgePack
  importPack: (pack: KnowledgePack) => KnowledgePack
  getPack: (id: string) => KnowledgePack | undefined
  lastPersistError: string | null
}

const KnowledgeStoreContext = createContext<KnowledgeStoreApi | null>(null)

function persistPacks(packs: KnowledgePack[]): Promise<SaveStoreResult> {
  const store = { version: 1 as const, packs }
  const backend = getActiveStorageBackend()
  if (backend.supportsSyncPacks) {
    return Promise.resolve(saveStore(store))
  }
  return saveStoreAsync(store)
}

export function KnowledgeStoreProvider({ children }: { children: ReactNode }) {
  const backend = getActiveStorageBackend()
  const sync = backend.supportsSyncPacks

  // Sync backends (browser-local / localStorage): load immediately so a deferred
  // write cannot race and wipe storage. Async backends hydrate in useEffect.
  const [packs, setPacks] = useState<KnowledgePack[]>(() =>
    typeof window === "undefined" || !sync ? [] : loadStore().packs,
  )
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && sync,
  )
  const [lastPersistError, setLastPersistError] = useState<string | null>(null)

  useEffect(() => {
    if (sync) return
    let cancelled = false
    void loadStoreAsync().then((store) => {
      if (cancelled) return
      setPacks(store.packs)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [sync])

  const savePack = useCallback((pack: KnowledgePack) => {
    const stamped = { ...pack, updatedAt: new Date().toISOString() }
    setPacks((prev) => {
      const next = upsertPack(prev, stamped)
      void persistPacks(next).then((result) => {
        setLastPersistError(result.ok ? null : result.error)
      })
      return next
    })
    return stamped
  }, [])

  const deletePack = useCallback((id: string) => {
    setPacks((prev) => {
      const next = removePack(prev, id)
      void persistPacks(next).then((result) => {
        setLastPersistError(result.ok ? null : result.error)
      })
      return next
    })
  }, [])

  const addSample = useCallback(() => {
    const sample = createSamplePack()
    setPacks((prev) => {
      const next = upsertPack(prev, sample)
      void persistPacks(next).then((result) => {
        setLastPersistError(result.ok ? null : result.error)
      })
      return next
    })
    return sample
  }, [])

  const importPack = useCallback((pack: KnowledgePack) => {
    const stamped: KnowledgePack = {
      ...pack,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    }
    setPacks((prev) => {
      const next = upsertPack(prev, stamped)
      void persistPacks(next).then((result) => {
        setLastPersistError(result.ok ? null : result.error)
      })
      return next
    })
    return stamped
  }, [])

  const getPack = useCallback(
    (id: string) => packs.find((p) => p.id === id),
    [packs],
  )

  const value = useMemo(
    () => ({
      packs,
      ready,
      savePack,
      deletePack,
      addSample,
      importPack,
      getPack,
      lastPersistError,
    }),
    [
      packs,
      ready,
      savePack,
      deletePack,
      addSample,
      importPack,
      getPack,
      lastPersistError,
    ],
  )

  return (
    <KnowledgeStoreContext.Provider value={value}>
      {children}
    </KnowledgeStoreContext.Provider>
  )
}

export function useKnowledgeStore() {
  const ctx = useContext(KnowledgeStoreContext)
  if (!ctx) {
    throw new Error("useKnowledgeStore must be used within KnowledgeStoreProvider")
  }
  return ctx
}
