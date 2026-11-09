"use client"

import { PackWorkspace } from "@/components/pack-workspace"
import { Button } from "@/components/ui/button"
import { useKnowledgeStore } from "@/hooks/use-knowledge-store"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { KnowledgePack } from "@/lib/types"

export function PackPageClient({ id }: { id: string }) {
  const { ready, getPack, savePack } = useKnowledgeStore()
  const [pack, setPack] = useState<KnowledgePack | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!ready) return
    const found = getPack(id)
    if (!found) {
      setMissing(true)
      setPack(null)
      return
    }
    setMissing(false)
    setPack(found)
  }, [ready, getPack, id])

  if (!ready || (!pack && !missing)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-[var(--ink-muted)]">
        Opening pack…
      </div>
    )
  }

  if (missing || !pack) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Pack not found
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          It may have been deleted from this browser&apos;s local storage.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to packs</Link>
        </Button>
      </div>
    )
  }

  return (
    <PackWorkspace
      pack={pack}
      onChange={(next) => {
        setPack(next)
        savePack(next)
      }}
    />
  )
}
