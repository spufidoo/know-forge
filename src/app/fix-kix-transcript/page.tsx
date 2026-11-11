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
const SESSION_HINT = "c8d0df2a-541e-4b01-968f-ae46072198c7"
const NEW_TITLE = "CICS interview"

function correctTranscript(text: string) {
  return text
    .replace(/\bkicks\b/gi, "CICS")
    .replace(/\bKICKS\b/g, "CICS")
}

export default function FixKixTranscriptPage() {
  const [status, setStatus] = useState("Applying CICS transcript fix…")
  const [detail, setDetail] = useState("")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const seedRes = await fetch(
          `/interviews/${SESSION_HINT}/transcript.txt`,
          { cache: "no-store" },
        )
        const fileTranscript = seedRes.ok ? (await seedRes.text()).trim() : ""

        const sessions = await listAllInterviewSessions()
        const target =
          sessions.find((s) => s.id === SESSION_HINT) ??
          sessions.find((s) => s.packId === TARGET_PACK) ??
          sessions.find((s) => /\bkicks\b/i.test(String(s.transcript ?? "")))

        if (!target) {
          if (!cancelled) {
            setStatus("No matching CICS session found in this browser.")
          }
          return
        }

        const raw = String(target.transcript || fileTranscript || "")
        const corrected = correctTranscript(raw)
        const kicksCount = (raw.match(/\bkicks\b/gi) || []).length

        const row = (await getInterviewSession(target.id)) ?? target
        await saveInterviewSession({
          ...row,
          title: NEW_TITLE,
          transcript: corrected,
          updatedAt: new Date().toISOString(),
        })

        const knowledge = loadStore()
        const pack =
          knowledge.packs.find((p) => p.id === TARGET_PACK) ??
          knowledge.packs.find((p) => p.id === String(target.packId))
        if (pack) {
          saveStore({
            version: 1,
            packs: upsertPack(knowledge.packs, {
              ...pack,
              interview: {
                sessionId: String(target.id),
                audioPath:
                  pack.interview?.audioPath ||
                  `/interviews/${String(target.id)}/interview.weba`,
                transcriptPath: `/interviews/${String(target.id)}/transcript.txt`,
                transcript: corrected,
                mimeType: pack.interview?.mimeType || String(target.mimeType || "audio/webm"),
                durationMs:
                  pack.interview?.durationMs ||
                  Number(target.durationMs || 0),
                title: NEW_TITLE,
                expertName:
                  pack.interview?.expertName ||
                  String(target.expertName || ""),
              },
              updatedAt: new Date().toISOString(),
            }),
          })
        }

        await fetch("/api/save-interview-export", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: String(target.id),
            packId: String(target.packId || TARGET_PACK),
            title: NEW_TITLE,
            expertName: String(target.expertName || ""),
            transcript: corrected,
            mimeType: String(target.mimeType || ""),
            durationMs: Number(target.durationMs || 0),
            candidates: target.candidates ?? [],
          }),
        })

        if (!cancelled) {
          setStatus("Transcript corrected and title set to CICS interview.")
          setDetail(
            `Session ${String(target.id)} — replaced ${kicksCount} "kicks" with "CICS". Studio pack interview + IndexedDB + workspace transcript updated.`,
          )
        }
      } catch (err) {
        if (!cancelled) {
          setStatus(err instanceof Error ? err.message : "Fix failed")
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
        Open CICS record page
      </Link>
    </main>
  )
}
