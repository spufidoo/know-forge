"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  // Identical initial state on server and client — hydrate from storage after mount
  // so SSR HTML matches the first client render (avoids hydration mismatch).
  const [packs, setPacks] = useState<KnowledgePack[]>([])
  const [ready, setReady] = useState(false)
  const [lastPersistError, setLastPersistError] = useState<string | null>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const sync = getActiveStorageBackend().supportsSyncPacks

    void (async () => {
      const store = sync ? loadStore() : await loadStoreAsync()
      if (cancelled) return
      setPacks(store.packs)
      hydratedRef.current = true
      setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const persistIfHydrated = useCallback((next: KnowledgePack[]) => {
    if (!hydratedRef.current) return
    void persistPacks(next).then((result) => {
      setLastPersistError(result.ok ? null : result.error)
    })
  }, [])

  const savePack = useCallback(
    (pack: KnowledgePack) => {
      const stamped = { ...pack, updatedAt: new Date().toISOString() }
      setPacks((prev) => {
        const next = upsertPack(prev, stamped)
        persistIfHydrated(next)
        return next
      })
      return stamped
    },
    [persistIfHydrated],
  )

  const deletePack = useCallback(
    (id: string) => {
      setPacks((prev) => {
        const next = removePack(prev, id)
        persistIfHydrated(next)
        return next
      })
    },
    [persistIfHydrated],
  )

  const addSample = useCallback(() => {
    const sample = createSamplePack()
    setPacks((prev) => {
      const next = upsertPack(prev, sample)
      persistIfHydrated(next)
      return next
    })
    return sample
  }, [persistIfHydrated])

  const importPack = useCallback(
    (pack: KnowledgePack) => {
      const stamped: KnowledgePack = {
        ...pack,
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      }
      setPacks((prev) => {
        const next = upsertPack(prev, stamped)
        persistIfHydrated(next)
        return next
      })
      return stamped
    },
    [persistIfHydrated],
  )

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
