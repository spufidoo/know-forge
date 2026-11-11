"use client"

import {
  getInterviewSession,
  listAllInterviewSessions,
  loadStore,
  saveInterviewSession,
  saveStore,
  upsertPack,
} from "@/lib/data-store"
import Link from "next/link"
import { useEffect, useState } from "react"

const TARGET_PACK = "0a1e5cd0-e570-4f81-b66f-aa8cdb65d42d"
const NEW_TITLE = "CICS interview"

export default function RenameSessionPage() {
  const [status, setStatus] = useState("Renaming session…")
  const [detail, setDetail] = useState("")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const sessions = await listAllInterviewSessions()
        const target =
          sessions.find((s) => s.packId === TARGET_PACK) ??
          sessions.find((s) => /cics|kix|kicks|l-?par|region/i.test(s.title)) ??
          sessions[0]

        if (!target) {
          if (!cancelled) setStatus("No interview session found to rename.")
          return
        }

        const row = (await getInterviewSession(target.id)) ?? target
        await saveInterviewSession({
          ...row,
          title: NEW_TITLE,
          updatedAt: new Date().toISOString(),
        })

        const knowledge = loadStore()
        const pack = knowledge.packs.find((p) => p.id === TARGET_PACK)
        if (pack?.interview) {
          saveStore({
            version: 1,
            packs: upsertPack(knowledge.packs, {
              ...pack,
              interview: { ...pack.interview, title: NEW_TITLE },
              updatedAt: new Date().toISOString(),
            }),
          })
        }

        await fetch("/api/save-interview-export", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: target.id,
            packId: target.packId,
            title: NEW_TITLE,
            transcript:
              (typeof pack?.interview?.transcript === "string" &&
                pack.interview.transcript) ||
              "[title rename only]",
          }),
        }).catch(() => undefined)

        if (!cancelled) {
          setStatus(`Renamed to "${NEW_TITLE}".`)
          setDetail(
            `Session ${target.id} (was "${target.title}") on pack ${target.packId}`,
          )
        }
      } catch (err) {
        if (!cancelled) {
          setStatus(err instanceof Error ? err.message : "Rename failed")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-3 px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {status}
      </h1>
      {detail ? (
        <p className="text-sm text-[var(--ink-muted)]">{detail}</p>
      ) : null}
      <Link
        className="text-sm text-[var(--signal)]"
        href={`/pack/${TARGET_PACK}/record`}
      >
        Open record page
      </Link>
    </main>
  )
}
