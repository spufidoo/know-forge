"use client"

import { AnalysisReview } from "@/components/interview/analysis-review"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useInterviewRecorder } from "@/hooks/use-interview-recorder"
import { useInterviewSessions } from "@/hooks/use-interview-sessions"
import {
  analyzeTranscript,
  applyCandidatesToPack,
  buildAnalysisBrief,
} from "@/lib/analyze-transcript"
import { downloadText, slugify } from "@/lib/export"
import { formatDuration } from "@/lib/interview-db"
import {
  emptyInterviewSession,
  type AnalysisCandidate,
  type InterviewSessionRecord,
} from "@/lib/interview-types"
import type { KnowledgePack } from "@/lib/types"
import {
  ArrowLeft,
  Download,
  Mic,
  Pause,
  Play,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

export function InterviewWorkspace({
  pack,
  onPackChange,
}: {
  pack: KnowledgePack
  onPackChange: (next: KnowledgePack) => void
}) {
  const { sessions, ready, save, remove, load } = useInterviewSessions(pack.id)
  const recorder = useInterviewRecorder()
  const [expertName, setExpertName] = useState("")
  const [title, setTitle] = useState("Expert interview")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  )

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const openSession = async (id: string) => {
    const full = await load(id)
    if (!full) return
    setActiveId(full.id)
    setTitle(full.title)
    setExpertName(full.expertName)
    recorder.setTranscript(full.transcript)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    if (full.audioBlob) {
      setAudioUrl(URL.createObjectURL(full.audioBlob))
    } else {
      setAudioUrl(null)
    }
  }

  const startFresh = () => {
    setActiveId(null)
    setTitle("Expert interview")
    setExpertName("")
    recorder.setTranscript("")
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setNotice(null)
  }

  const persistRecording = async () => {
    setSaving(true)
    setNotice(null)
    try {
      const stopped = await recorder.stop()
      const existing = activeId ? await load(activeId) : null
      const base =
        existing ??
        emptyInterviewSession(pack.id, {
          title: title || "Expert interview",
          expertName,
        })

      const transcript = recorder.getTranscript()
      const candidates =
        transcript.length >= 40 ? analyzeTranscript(transcript) : base.candidates
      if (transcript !== recorder.transcript) {
        recorder.setTranscript(transcript)
      }

      const next: InterviewSessionRecord = {
        ...base,
        title: title || "Expert interview",
        expertName,
        transcript,
        durationMs: stopped.durationMs || base.durationMs,
        mimeType: stopped.mimeType || base.mimeType,
        hasAudio: Boolean(stopped.blob) || Boolean(existing?.audioBlob),
        audioBlob: stopped.blob ?? existing?.audioBlob,
        status: candidates.length ? "analyzed" : "ready",
        candidates: candidates.length ? candidates : base.candidates,
        updatedAt: new Date().toISOString(),
      }

      const saved = await save(next)
      setActiveId(saved.id)
      if (saved.audioBlob) {
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(URL.createObjectURL(saved.audioBlob))
      }
      setNotice(
        candidates.length
          ? `Saved and extracted ${candidates.length} candidate entries.`
          : "Saved interview. Add or edit the transcript, then analyze.",
      )
    } finally {
      setSaving(false)
    }
  }

  const runAnalysis = async () => {
    const transcript = recorder.getTranscript()
    if (transcript.length < 40) {
      setNotice("Need a longer transcript before analysis.")
      return
    }
    if (transcript !== recorder.transcript) {
      recorder.setTranscript(transcript)
    }
    const candidates = analyzeTranscript(transcript)
    const existing = activeId ? await load(activeId) : null
    const next: InterviewSessionRecord = {
      ...(existing ??
        emptyInterviewSession(pack.id, {
          title: title || "Expert interview",
          expertName,
        })),
      title: title || "Expert interview",
      expertName,
      transcript,
      candidates,
      status: "analyzed",
      hasAudio: Boolean(existing?.audioBlob) || Boolean(existing?.hasAudio),
      audioBlob: existing?.audioBlob,
    }
    const saved = await save(next)
    setActiveId(saved.id)
    setNotice(`Found ${candidates.length} candidate knowledge entries.`)
  }

  const updateCandidates = async (candidates: AnalysisCandidate[]) => {
    if (!activeId) return
    const existing = await load(activeId)
    if (!existing) return
    await save({ ...existing, candidates, status: "analyzed" })
  }

  const applyAccepted = async () => {
    if (!activeSession) return
    const accepted = activeSession.candidates.filter((c) => c.status === "accepted")
    if (!accepted.length) {
      setNotice("Accept at least one candidate first.")
      return
    }
    onPackChange(applyCandidatesToPack(pack, accepted))
    const remaining = activeSession.candidates.map((c) =>
      c.status === "accepted" ? { ...c, status: "rejected" as const } : c,
    )
    await updateCandidates(remaining)
    setNotice(`Added ${accepted.length} entries to ${pack.name || "the pack"}.`)
  }

  const exportBrief = () => {
    const brief = buildAnalysisBrief({
      packName: pack.name,
      expertName,
      transcript: recorder.getTranscript() || recorder.transcript,
      candidates: activeSession?.candidates ?? [],
    })
    downloadText(
      `${slugify(pack.name || "pack")}-interview-brief.md`,
      brief,
      "text/markdown;charset=utf-8",
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/pack/${pack.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            <ArrowLeft className="size-3.5" />
            Back to pack
          </Link>
          <ThemeToggle />
        </div>
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--signal)]">
            Android interview mode
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
            Record an expert
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ink-muted)]">
            Capture the conversation on your phone, auto-transcribe where
            supported, then extract tribal knowledge into{" "}
            {pack.name || "this pack"}. Get consent before recording.
          </p>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--ink)] p-5 text-[var(--mist)] shadow-[0_24px_60px_rgba(6,42,50,0.28)] sm:p-6">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(31,168,122,0.35),transparent_70%)]" />
        <div className="relative grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="text-[var(--mist)]/70">Session title</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-white/15 bg-white/5 text-[var(--mist)]"
              placeholder="On-call heuristics with Maya"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-[var(--mist)]/70">Expert name</span>
            <Input
              value={expertName}
              onChange={(e) => setExpertName(e.target.value)}
              className="border-white/15 bg-white/5 text-[var(--mist)]"
              placeholder="Optional"
            />
          </label>

          <div className="flex items-end justify-between gap-3 pt-2">
            <div>
              <p className="font-mono text-4xl tracking-tight text-[var(--signal)]">
                {formatDuration(recorder.elapsedMs)}
              </p>
              <p className="mt-1 text-xs text-[var(--mist)]/65">
                {recorder.recording
                  ? recorder.paused
                    ? "Paused"
                    : "Recording…"
                  : "Ready"}
                {recorder.speechSupported
                  ? " · Live transcription on"
                  : " · Paste transcript after recording"}
              </p>
            </div>
            <div
              className={`size-4 rounded-full ${
                recorder.recording && !recorder.paused
                  ? "animate-pulse bg-red-400"
                  : "bg-white/25"
              }`}
              aria-hidden
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {!recorder.recording ? (
              <Button
                size="lg"
                onClick={() => void recorder.start()}
                className="bg-[var(--signal)] text-[var(--ink)] hover:bg-[var(--signal)]/90"
              >
                <Mic className="size-4" />
                Start recording
              </Button>
            ) : (
              <>
                {recorder.paused ? (
                  <Button size="lg" variant="secondary" onClick={recorder.resume}>
                    <Play className="size-4" />
                    Resume
                  </Button>
                ) : (
                  <Button size="lg" variant="secondary" onClick={recorder.pause}>
                    <Pause className="size-4" />
                    Pause
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-transparent text-[var(--mist)]"
                  disabled={saving}
                  onClick={() => void persistRecording()}
                >
                  <Square className="size-4" />
                  Stop & save
                </Button>
              </>
            )}
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 bg-transparent text-[var(--mist)]"
              onClick={startFresh}
            >
              New session
            </Button>
          </div>

          {recorder.error ? (
            <p className="text-sm text-red-300">{recorder.error}</p>
          ) : null}
          {notice ? (
            <p className="text-sm text-[var(--signal)]">{notice}</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Transcript
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void runAnalysis()}>
              <Sparkles className="size-4" />
              Analyze
            </Button>
            <Button type="button" variant="outline" onClick={exportBrief}>
              <Download className="size-4" />
              Export brief
            </Button>
          </div>
        </div>
        <Textarea
          value={recorder.transcript}
          onChange={(e) => recorder.setTranscript(e.target.value)}
          placeholder="Live speech-to-text appears here on Chrome Android. You can also paste a transcript."
          className="min-h-40 bg-[var(--panel-2)]"
        />
        {recorder.interim ? (
          <p className="text-sm italic text-[var(--ink-faint)]">
            Listening: {recorder.interim}
          </p>
        ) : null}
        {audioUrl ? (
          <audio controls src={audioUrl} className="w-full" />
        ) : null}
      </section>

      {activeSession?.candidates?.length ? (
        <div className="mt-6">
          <AnalysisReview
            candidates={activeSession.candidates}
            onChange={(candidates) => void updateCandidates(candidates)}
            onApplyAccepted={() => void applyAccepted()}
          />
        </div>
      ) : null}

      <section className="mt-8 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Saved interviews
        </h2>
        {!ready ? (
          <p className="text-sm text-[var(--ink-muted)]">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No recordings yet on this device.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li
                key={session.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  session.id === activeId
                    ? "border-[var(--signal)]/50 bg-[var(--signal-soft)]"
                    : "border-[var(--line)] bg-[var(--panel)]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => void openSession(session.id)}
                  >
                    <p className="font-medium text-[var(--ink)]">{session.title}</p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {session.expertName || "Unnamed expert"} ·{" "}
                      {formatDuration(session.durationMs)} ·{" "}
                      {session.candidates.length} candidates
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete interview"
                    onClick={() => void remove(session.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
