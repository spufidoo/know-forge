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
import Link from "next/link"
import { useEffect, useState } from "react"

type SessionRow = {
  id: string
  packId: string
  title: string
  expertName: string
  transcript: string
  mimeType: string
  durationMs: number
  status: string
  candidates: unknown[]
  hasAudio: boolean
  updatedAt: string
  createdAt: string
}

function toSessionRow(row: InterviewSessionRecord): SessionRow {
  return {
    id: row.id,
    packId: row.packId,
    title: row.title,
    expertName: row.expertName,
    transcript: row.transcript,
    mimeType: row.mimeType,
    durationMs: row.durationMs,
    status: row.status,
    candidates: row.candidates ?? [],
    hasAudio: Boolean(row.audioBlob) || row.hasAudio,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  }
}

async function listAllSessions(): Promise<SessionRow[]> {
  const rows = await listAllInterviewSessions()
  return rows.map(toSessionRow)
}

export default function ExportSessionsPage() {
  const [status, setStatus] = useState("Reading IndexedDB sessions…")
  const [lines, setLines] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const sessions = await listAllSessions()
        if (cancelled) return
        if (!sessions.length) {
          setStatus("No interview sessions found in this browser.")
          return
        }

        const preferredPackId = "0a1e5cd0-e570-4f81-b66f-aa8cdb65d42d"
        const out: string[] = [`Found ${sessions.length} session(s) in IndexedDB.`]
        for (const s of sessions) {
          out.push(
            `• ${s.id.slice(0, 8)}… pack=${s.packId.slice(0, 8)}… text=${s.transcript.trim().length} audio=${s.hasAudio} status=${s.status} updated=${s.updatedAt || s.createdAt || "?"}`,
          )
        }

        const target =
          sessions.find(
            (s) =>
              s.packId === preferredPackId && s.transcript.trim().length >= 20,
          ) ??
          sessions.find(
            (s) => s.packId === preferredPackId && s.hasAudio,
          ) ??
          sessions.find((s) => s.transcript.trim().length >= 20) ??
          sessions[0]

        out.push(`Target session: ${target.id}`)
        out.push(`Pack: ${target.packId}`)
        out.push(`Title: ${target.title}`)
        out.push(`Expert: ${target.expertName || "(none)"}`)
        out.push(`Duration ms: ${target.durationMs}`)
        out.push(`Has audio: ${target.hasAudio}`)
        out.push(`Transcript chars: ${target.transcript.trim().length}`)

        const transcript = target.transcript.trim()
        if (transcript.length < 20) {
          out.push(
            "Transcript too short for analyze — live STT empty and Whisper text was not persisted on the session.",
          )
          out.push(
            "Retry: open Record an expert → Upload the .weba / use Stop&save again after local Whisper fills the transcript → Analyze.",
          )
          setLines(out)
          setStatus("CICS session has audio but no usable transcript yet.")
          // Still export a stub so we can see the gap on disk.
          await fetch("/api/save-interview-export", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              sessionId: target.id,
              packId: target.packId,
              title: target.title,
              expertName: target.expertName,
              transcript: transcript || "[empty transcript]",
              mimeType: target.mimeType,
              durationMs: target.durationMs,
              candidates: [],
            }),
          })
          return
        }

        const candidates = analyzeTranscript(transcript)
        out.push(`Local analyze candidates: ${candidates.length}`)
        for (const c of candidates) {
          out.push(`- [${c.kind}/${c.confidence}] ${c.title}`)
        }

        const store = loadStore()
        const pack = store.packs.find((p) => p.id === target.packId)
        if (pack) {
          const next = {
            ...pack,
            interview: {
              sessionId: target.id,
              audioPath: `/interviews/${target.id}/interview.weba`,
              transcriptPath: `/interviews/${target.id}/transcript.txt`,
              transcript,
              mimeType: target.mimeType || "audio/webm",
              durationMs: target.durationMs,
              title: target.title,
              expertName: target.expertName,
            },
            updatedAt: new Date().toISOString(),
          }
          saveStore({ version: 1, packs: upsertPack(store.packs, next) })
          out.push(`Updated pack.interview on ${pack.name || pack.id}`)
        } else {
          out.push(`Pack ${target.packId} not found in localStorage.`)
        }

        const saveRes = await fetch("/api/save-interview-export", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            sessionId: target.id,
            packId: target.packId,
            title: target.title,
            expertName: target.expertName,
            transcript,
            mimeType: target.mimeType,
            durationMs: target.durationMs,
            candidates,
          }),
        })
        const saved = (await saveRes.json()) as {
          ok?: boolean
          transcriptPath?: string
          analysisPath?: string
          error?: string
        }
        if (!saveRes.ok) {
          out.push(`Workspace save failed: ${saved.error || saveRes.status}`)
        } else {
          out.push(`Wrote ${saved.transcriptPath}`)
          out.push(`Wrote ${saved.analysisPath}`)
        }

        const existing = await getInterviewSession(target.id)
        if (existing) {
          await saveInterviewSession({
            ...existing,
            transcript,
            candidates,
            status: "analyzed",
            updatedAt: new Date().toISOString(),
          })
          out.push("Session updated with analyzed candidates via data-store.")
        }

        if (!cancelled) {
          setLines(out)
          setStatus(
            candidates.length
              ? `Analyze OK — ${candidates.length} candidate(s).`
              : "Analyze ran but extracted 0 candidates.",
          )
        }
      } catch (err) {
        if (!cancelled) {
          setStatus(err instanceof Error ? err.message : "Export failed")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--signal)]">
        Session export + local analyze
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {status}
      </h1>
      <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--ink)]">
        {lines.map((line) => (
          <li key={line} className="break-words">
            {line}
          </li>
        ))}
      </ul>
      <Link className="text-sm text-[var(--signal)]" href="/">
        Back to packs
      </Link>
    </main>
  )
}
