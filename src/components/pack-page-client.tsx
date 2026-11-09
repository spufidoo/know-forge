"use client"

import { PackWorkspace } from "@/components/pack-workspace"
import { Button } from "@/components/ui/button"
import { useKnowledgeStore } from "@/hooks/use-knowledge-store"
import Link from "next/link"

export function PackPageClient({ id }: { id: string }) {
  const { ready, getPack, savePack } = useKnowledgeStore()
  const pack = ready ? getPack(id) : undefined

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-[var(--ink-muted)]">
        Opening pack…
      </div>
    )
  }

  if (!pack) {
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
        savePack(next)
      }}
    />
  )
}
