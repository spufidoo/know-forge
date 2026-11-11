"use client"

import { analyzeTranscript } from "@/lib/analyze-transcript"
import {
  getInterviewSession,
  listAllInterviewSessions,
  loadStore,
  saveInterviewSession,
  saveStore,
  upsertPack,
} from "@/lib/data-store"
import type { InterviewSessionRecord } from "@/lib/interview-types"
import { emptyPack } from "@/lib/types"
import Link from "next/link"
import { useEffect, useState } from "react"

const TARGET_PACK = "0a1e5cd0-e570-4f81-b66f-aa8cdb65d42d"
const SESSION_HINT = "c8d0df2a-541e-4b01-968f-ae46072198c7"
const PACK_NAME = "CICS interview"

function correctTranscript(text: string) {
  return text.replace(/\bkicks\b/gi, "CICS")
}

export default function EnsureKixPackPage() {
  const [status, setStatus] = useState("Ensuring CICS interview pack…")
  const [detail, setDetail] = useState("")
  const [packId, setPackId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const fileRes = await fetch(
          `/interviews/${SESSION_HINT}/transcript.txt`,
          { cache: "no-store" },
        )
        const fileTranscript = fileRes.ok
          ? correctTranscript((await fileRes.text()).trim())
          : ""

        const sessions = await listAllInterviewSessions()
        const session: InterviewSessionRecord | undefined =
          sessions.find((s) => s.id === SESSION_HINT) ??
          sessions.find((s) => s.packId === TARGET_PACK) ??
          sessions.find((s) =>
            /cics|kicks|l-?par|region/i.test(String(s.transcript ?? "")),
          )

        const rawTranscript = String(
          session?.transcript || fileTranscript || "",
        ).trim()
        const transcript = correctTranscript(rawTranscript)
        const kicksFixed = (rawTranscript.match(/\bkicks\b/gi) || []).length

        const store = loadStore()
        let pack =
          store.packs.find((p) => p.id === TARGET_PACK) ??
          store.packs.find((p) => p.name === PACK_NAME) ??
          store.packs.find((p) => p.name === "Kix interview") ??
          null

        if (!pack) {
          pack = emptyPack({
            id: TARGET_PACK,
            name: PACK_NAME,
            domain: "IBM CICS on z/OS",
            purpose:
              "Capture veteran CICS triage judgment for agents supporting IBM Z operations.",
            audience:
              "CICS systems programmers and IBM Z database / middleware operators",
          })
        }

        const candidates = transcript.length >= 40 ? analyzeTranscript(transcript) : []

        pack = {
          ...pack,
          name: PACK_NAME,
          domain: pack.domain || "IBM CICS on z/OS",
          purpose:
            pack.purpose ||
            "Capture veteran CICS triage judgment for agents supporting IBM Z operations.",
          audience:
            pack.audience ||
            "CICS systems programmers and IBM Z database / middleware operators",
          interview: {
            sessionId: String(session?.id || SESSION_HINT),
            audioPath: `/interviews/${String(session?.id || SESSION_HINT)}/interview.weba`,
            transcriptPath: `/interviews/${String(session?.id || SESSION_HINT)}/transcript.txt`,
            transcript,
            mimeType: String(session?.mimeType || "audio/webm"),
            durationMs: Number(session?.durationMs || 0),
            title: PACK_NAME,
            expertName: String(session?.expertName || ""),
          },
          updatedAt: new Date().toISOString(),
        }

        saveStore({ version: 1, packs: upsertPack(store.packs, pack) })

        if (session?.id) {
          const existing =
            (await getInterviewSession(session.id)) ?? session
          await saveInterviewSession({
            ...existing,
            packId: pack.id,
            title: PACK_NAME,
            transcript,
            candidates: candidates.length
              ? candidates
              : existing.candidates ?? [],
            status: candidates.length ? "analyzed" : existing.status,
            updatedAt: new Date().toISOString(),
          })
        }

        await fetch("/api/save-interview-export", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: String(session?.id || SESSION_HINT),
            packId: pack.id,
            title: PACK_NAME,
            expertName: String(session?.expertName || ""),
            transcript: transcript || "[empty]",
            mimeType: String(session?.mimeType || ""),
            durationMs: Number(session?.durationMs || 0),
            candidates,
          }),
        })

        if (!cancelled) {
          setPackId(pack.id)
          setStatus(`Pack "${PACK_NAME}" is saved and should appear on Home.`)
          setDetail(
            `Pack id ${pack.id}. Session title set to "${PACK_NAME}". Replaced ${kicksFixed} "kicks" with "CICS". Candidates: ${candidates.length}. Refresh Home if needed.`,
          )
        }
      } catch (err) {
        if (!cancelled) {
          setStatus(err instanceof Error ? err.message : "Failed to ensure pack")
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
      <div className="flex flex-wrap gap-3 pt-2">
        <Link className="text-sm text-[var(--signal)]" href="/">
          Open Home
        </Link>
        {packId ? (
          <Link
            className="text-sm text-[var(--signal)]"
            href={`/pack/${packId}/record`}
          >
            Open CICS record page
          </Link>
        ) : null}
      </div>
    </main>
  )
}
