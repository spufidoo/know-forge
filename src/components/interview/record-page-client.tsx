"use client"

import { InterviewWorkspace } from "@/components/interview/interview-workspace"
import { Button } from "@/components/ui/button"
import { useKnowledgeStore } from "@/hooks/use-knowledge-store"
import Link from "next/link"

export function RecordPageClient({ id }: { id: string }) {
  const { ready, getPack, savePack } = useKnowledgeStore()
  const pack = ready ? getPack(id) : undefined

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-[var(--ink-muted)]">
        Opening interview mode…
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
          Create a pack first, then record an expert interview against it.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to packs</Link>
        </Button>
      </div>
    )
  }

  return (
    <InterviewWorkspace
      pack={pack}
      onPackChange={(next) => {
        savePack(next)
      }}
    />
  )
}
