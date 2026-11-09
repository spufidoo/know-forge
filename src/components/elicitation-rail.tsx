"use client"

import { Button } from "@/components/ui/button"
import { promptsFor } from "@/lib/prompts"
import type { EntryKind } from "@/lib/types"
import { Sparkles } from "lucide-react"

export function ElicitationRail({
  kind,
  onUsePrompt,
}: {
  kind: EntryKind | "all"
  onUsePrompt: (question: string, promptKind: EntryKind) => void
}) {
  const prompts = promptsFor(kind)

  return (
    <aside className="rounded-2xl border border-[var(--line)] bg-[var(--panel)]/80 p-4 backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-[var(--signal)]" />
        <h2 className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[var(--ink-muted)]">
          Elicitation prompts
        </h2>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-[var(--ink-muted)]">
        Ask the expert out loud. Capture the answer into a structured entry.
      </p>
      <ul className="space-y-2">
        {prompts.map((prompt) => (
          <li
            key={prompt.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3"
          >
            <p className="text-sm font-medium leading-snug text-[var(--ink)]">
              {prompt.question}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">{prompt.hint}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => onUsePrompt(prompt.question, prompt.kind)}
            >
              Start from this
            </Button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
