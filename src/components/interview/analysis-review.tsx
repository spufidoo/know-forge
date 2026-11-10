"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AnalysisCandidate } from "@/lib/interview-types"
import { Check, X } from "lucide-react"

const kindLabel = {
  heuristic: "Heuristic",
  procedure: "Procedure",
  gotcha: "Gotcha",
  term: "Term",
} as const

export function AnalysisReview({
  candidates,
  onChange,
  onApplyAccepted,
}: {
  candidates: AnalysisCandidate[]
  onChange: (next: AnalysisCandidate[]) => void
  onApplyAccepted: () => void
}) {
  const pending = candidates.filter((c) => c.status === "pending").length
  const accepted = candidates.filter((c) => c.status === "accepted").length

  const setStatus = (
    id: string,
    status: AnalysisCandidate["status"],
  ) => {
    onChange(
      candidates.map((c) => (c.id === id ? { ...c, status } : c)),
    )
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Analysis candidates
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {pending} pending · {accepted} accepted. Review before adding to the
            pack.
          </p>
        </div>
        <Button type="button" onClick={onApplyAccepted} disabled={!accepted}>
          Add accepted to pack
        </Button>
      </div>

      <ul className="space-y-3">
        {candidates.map((candidate) => (
          <li
            key={candidate.id}
            className={`rounded-xl border p-3 sm:p-4 ${
              candidate.status === "accepted"
                ? "border-[var(--signal)]/40 bg-[var(--signal-soft)]"
                : candidate.status === "rejected"
                  ? "border-[var(--line)] bg-[var(--panel-2)] opacity-60"
                  : "border-[var(--line)] bg-[var(--panel-2)]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{kindLabel[candidate.kind]}</Badge>
                  <Badge variant="outline">{candidate.confidence}</Badge>
                  <Badge variant="outline">{candidate.status}</Badge>
                </div>
                <p className="font-medium text-[var(--ink)]">{candidate.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
                  {candidate.excerpt}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="icon-sm"
                  variant={candidate.status === "accepted" ? "default" : "outline"}
                  aria-label="Accept candidate"
                  onClick={() => setStatus(candidate.id, "accepted")}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant={candidate.status === "rejected" ? "destructive" : "outline"}
                  aria-label="Reject candidate"
                  onClick={() => setStatus(candidate.id, "rejected")}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
