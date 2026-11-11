"use client"

import { importInterviewSeed } from "@/lib/import-interview-seed"
import Link from "next/link"
import { useEffect, useState } from "react"

type Status = "working" | "done" | "error"

export default function ImportSeedPage() {
  const [status, setStatus] = useState<Status>("working")
  const [message, setMessage] = useState("Importing interview seed…")
  const [packId, setPackId] = useState<string | null>(null)
  const [summary, setSummary] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const force =
          new URLSearchParams(window.location.search).get("force") === "1"
        const result = await importInterviewSeed({ force })
        if (cancelled) return
        setPackId(result.pack.id)
        setStatus("done")
        setMessage(
          result.alreadyImported
            ? "This interview seed was already imported in this browser."
            : "Interview imported into Knowledge Elicitation Studio.",
        )
        setSummary(result.summary)
      } catch (err) {
        if (!cancelled) {
          setStatus("error")
          setMessage(err instanceof Error ? err.message : "Import failed")
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 px-4 py-10">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--signal)]">
        One-shot seed import
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {status === "working"
          ? "Importing…"
          : status === "done"
            ? "Import complete"
            : "Import failed"}
      </h1>
      <p className="text-sm text-[var(--ink-muted)]">{message}</p>
      {summary.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--ink)]">
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-3 pt-2">
        {packId ? (
          <>
            <Link
              className="rounded-lg bg-[var(--signal)] px-3 py-2 text-sm text-[var(--ink)]"
              href={`/pack/${packId}/record`}
            >
              Open interview recorder
            </Link>
            <Link
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)]"
              href={`/pack/${packId}`}
            >
              Open pack
            </Link>
          </>
        ) : (
          <Link
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)]"
            href="/"
          >
            Home
          </Link>
        )}
      </div>
    </main>
  )
}
