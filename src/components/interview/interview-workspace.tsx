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
import { importInterviewSeed } from "@/lib/import-interview-seed"
import { formatDuration } from "@/lib/interview-db"
import {
  emptyInterviewSession,
  type AnalysisCandidate,
  type InterviewSessionRecord,
} from "@/lib/interview-types"
import { transcribeAudioFile } from "@/lib/transcribe-client"
import type { KnowledgePack } from "@/lib/types"
import {
  ArrowLeft,
  Download,
  Mic,
  Pause,
  Play,
  Plus,
  Sparkles,
  Square,
  Trash2,
  Upload,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

const MAX_UPLOAD_BYTES = 24 * 1024 * 1024

/** Outline controls on the dark recorder panel — keep mist text on hover. */
const darkPanelOutlineBtn =
  "border-white/20 bg-transparent text-[var(--mist)] hover:bg-white/10 hover:text-[var(--mist)]"

/** Map MediaRecorder mime types to a Whisper-friendly filename extension. */
function extensionForAudioMime(mimeType: string | undefined | null): string {
  const mime = (mimeType || "").toLowerCase()
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) {
    return "mp4"
  }
  if (mime.includes("ogg") || mime.includes("opus")) {
    // audio/webm;codecs=opus is webm — only bare ogg/opus containers use .ogg
    if (mime.includes("webm")) return "webm"
    return "ogg"
  }
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3"
  if (mime.includes("wav")) return "wav"
  if (mime.includes("webm")) return "webm"
  return "webm"
}

function interviewFilename(mimeType: string | undefined | null): string {
  return `interview.${extensionForAudioMime(mimeType)}`
}

export function InterviewWorkspace({
  pack,
  onPackChange,
}: {
  pack: KnowledgePack
  onPackChange: (next: KnowledgePack) => void
}) {
  const { sessions, ready, save, remove, load, refresh } = useInterviewSessions(
    pack.id,
  )
  const recorder = useInterviewRecorder()
  const [expertName, setExpertName] = useState("")
  const [title, setTitle] = useState("Expert interview")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [analysisCandidates, setAnalysisCandidates] = useState<
    AnalysisCandidate[]
  >([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  )

  const reviewCandidates = analysisCandidates.length
    ? analysisCandidates
    : (activeSession?.candidates ?? [])

  const ensureTranscriptFromAudio = async (
    blob: Blob | null | undefined,
    current: string,
    filename: string,
  ) => {
    if (current.trim().length >= 40 || !blob || blob.size === 0) {
      return current.trim()
    }
    setTranscribing(true)
    setNotice("Live speech was empty — transcribing the audio recording…")
    try {
      const text = await transcribeAudioFile(blob, filename)
      recorder.setTranscript(text)
      return text
    } finally {
      setTranscribing(false)
    }
  }

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // One-shot: hydrate this pack from the offline Whisper seed when present.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await importInterviewSeed({ packIdHint: pack.id })
        if (cancelled) return
        if (!result.alreadyImported) {
          onPackChange(result.pack)
          setNotice("Imported offline Whisper transcript into this interview.")
        }
        await refresh()
        const full = await load(result.sessionId)
        if (!full || cancelled) return
        // Re-bind seed session to the pack currently open so Analyze UI can find it.
        const bound =
          full.packId === pack.id
            ? full
            : await save({ ...full, packId: pack.id })
        if (cancelled) return
        setActiveId(bound.id)
        setTitle(bound.title)
        setExpertName(bound.expertName)
        recorder.setTranscript(bound.transcript)
        setAnalysisCandidates(bound.candidates ?? [])
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return bound.audioBlob ? URL.createObjectURL(bound.audioBlob) : null
        })
      } catch {
        // Seed is optional; ignore if absent.
      }
    })()
    return () => {
      cancelled = true
    }
    // Intentionally once per pack mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id])

  const openSession = async (id: string) => {
    const full = await load(id)
    if (!full) return
    setActiveId(full.id)
    setTitle(full.title)
    setExpertName(full.expertName)
    recorder.setTranscript(full.transcript)
    setAnalysisCandidates(full.candidates ?? [])
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    if (full.audioBlob) {
      setAudioUrl(URL.createObjectURL(full.audioBlob))
    } else {
      setAudioUrl(null)
    }
  }

  /** Start a new interview session that still belongs to this pack (not a new pack). */
  const startAdditionalInterview = () => {
    const nextNumber = sessions.length + 1
    setActiveId(null)
    setTitle(
      sessions.length === 0
        ? "Expert interview"
        : `Interview ${nextNumber} — ${pack.name || "follow-up"}`,
    )
    setExpertName("")
    recorder.setTranscript("")
    setAnalysisCandidates([])
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setNotice(
      sessions.length === 0
        ? `Ready to record the first interview for ${pack.name || "this pack"}.`
        : `New blank session for ${pack.name || "this pack"}. Stop & save to add it under Saved interviews — it will not create a new pack.`,
    )
    window.scrollTo({ top: 0, behavior: "smooth" })
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

      let transcript = recorder.getTranscript()
      let transcriptionError: string | null = null
      try {
        transcript = await ensureTranscriptFromAudio(
          stopped.blob,
          transcript,
          interviewFilename(stopped.mimeType),
        )
      } catch (err) {
        transcriptionError =
          err instanceof Error
            ? err.message
            : "Could not transcribe audio. Paste a transcript or try Upload."
      }

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
      setAnalysisCandidates(saved.candidates ?? [])
      if (saved.audioBlob) {
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(URL.createObjectURL(saved.audioBlob))
      }
      if (transcriptionError) {
        // Keep the real Whisper/API error — do not hide it behind a generic save notice.
        setNotice(
          `Saved audio, but transcription failed: ${transcriptionError}`,
        )
      } else {
        setNotice(
          candidates.length
            ? `Saved and extracted ${candidates.length} candidate entries.`
            : "Saved interview. Add or edit the transcript, then analyze.",
        )
      }
    } finally {
      setSaving(false)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    setNotice("Analyzing transcript…")
    try {
      let transcript = recorder.getTranscript().trim()
      if (!transcript) {
        transcript = recorder.transcript.trim()
      }
      if (transcript.length < 40) {
        const existing = activeId ? await load(activeId) : null
        if (existing?.audioBlob) {
          try {
            setNotice("Transcript short — running local Whisper on audio…")
            transcript = await ensureTranscriptFromAudio(
              existing.audioBlob,
              transcript,
              interviewFilename(existing.mimeType),
            )
          } catch (err) {
            setNotice(
              err instanceof Error
                ? err.message
                : "Need a longer transcript before analysis.",
            )
            return
          }
        }
      }
      if (transcript.length < 40) {
        setNotice("Need a longer transcript before analysis.")
        return
      }
      if (transcript !== recorder.transcript) {
        recorder.setTranscript(transcript)
      }

      // Local heuristic extraction (no LLM / OpenAI).
      const candidates = analyzeTranscript(transcript)
      setAnalysisCandidates(candidates)

      const existing = activeId ? await load(activeId) : null
      const next: InterviewSessionRecord = {
        ...(existing ??
          emptyInterviewSession(pack.id, {
            title: title || "Expert interview",
            expertName,
          })),
        packId: pack.id,
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
      setNotice(
        candidates.length
          ? `Found ${candidates.length} candidate knowledge entries.`
          : "Analyze finished, but no structured candidates were extracted. Try editing the transcript or adding clearer Q&A turns.",
      )
    } catch (err) {
      setNotice(
        err instanceof Error
          ? `Analyze failed: ${err.message}`
          : "Analyze failed unexpectedly.",
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const onUploadAudio = async (file: File | null) => {
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setNotice("Audio must be 24 MB or smaller.")
      return
    }
    const type = (file.type || "").toLowerCase()
    const name = file.name.toLowerCase()
    const okType =
      type.startsWith("audio/") ||
      type.startsWith("video/") ||
      [".webm", ".mp3", ".mp4", ".m4a", ".wav", ".ogg"].some((ext) =>
        name.endsWith(ext),
      )
    if (!okType) {
      setNotice("Unsupported file type. Use webm, mp3, m4a, wav, ogg, or mp4.")
      return
    }

    setSaving(true)
    setNotice(`Uploading and transcribing ${file.name}…`)
    try {
      const text = await transcribeAudioFile(file, file.name)
      recorder.setTranscript(text)
      const candidates = analyzeTranscript(text)
      const existing = activeId ? await load(activeId) : null
      const next: InterviewSessionRecord = {
        ...(existing ??
          emptyInterviewSession(pack.id, {
            title: title || file.name.replace(/\.[^.]+$/, ""),
            expertName,
          })),
        title: title || file.name.replace(/\.[^.]+$/, "") || "Uploaded interview",
        expertName,
        transcript: text,
        durationMs: existing?.durationMs ?? 0,
        mimeType: file.type || existing?.mimeType || "audio/webm",
        hasAudio: true,
        audioBlob: file,
        status: candidates.length ? "analyzed" : "ready",
        candidates,
      }
      const saved = await save(next)
      setActiveId(saved.id)
      setTitle(saved.title)
      setAnalysisCandidates(saved.candidates ?? [])
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl(URL.createObjectURL(file))
      setNotice(
        candidates.length
          ? `Transcribed upload and found ${candidates.length} candidate entries.`
          : "Transcribed upload. Review the transcript, then analyze.",
      )
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Upload transcription failed.",
      )
    } finally {
      setSaving(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const updateCandidates = async (candidates: AnalysisCandidate[]) => {
    setAnalysisCandidates(candidates)
    if (!activeId) return
    const existing = await load(activeId)
    if (!existing) return
    await save({
      ...existing,
      packId: pack.id,
      candidates,
      status: "analyzed",
    })
  }

  const applyAccepted = async () => {
    const accepted = reviewCandidates.filter((c) => c.status === "accepted")
    if (!accepted.length) {
      setNotice("Accept at least one candidate first.")
      return
    }
    onPackChange(applyCandidatesToPack(pack, accepted))
    const remaining = reviewCandidates.map((c) =>
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
      candidates: reviewCandidates,
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
            Capture conversations for{" "}
            <span className="text-[var(--ink)]">{pack.name || "this pack"}</span>
            . Each recording becomes another interview session on this pack
            (listed under Saved interviews) — not a new pack. Use{" "}
            <span className="text-[var(--ink)]">Add another interview</span> when
            you need a further session. Get consent before recording.
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
                  ? recorder.speechListening
                    ? " · Live STT listening"
                    : " · Live STT ready"
                  : " · Paste / upload transcript"}
                {transcribing ? " · Transcribing…" : ""}
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
                  className={darkPanelOutlineBtn}
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
              className={darkPanelOutlineBtn}
              disabled={saving || transcribing || recorder.recording}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Upload audio
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={darkPanelOutlineBtn}
              disabled={recorder.recording}
              onClick={startAdditionalInterview}
            >
              <Plus className="size-4" />
              Add another interview
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/mp4,video/webm,.mp3,.m4a,.wav,.ogg,.webm,.mp4"
              className="hidden"
              onChange={(e) => void onUploadAudio(e.target.files?.[0] ?? null)}
            />
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
            <Button
              type="button"
              variant="outline"
              disabled={saving || transcribing || analyzing}
              onClick={() => void runAnalysis()}
            >
              <Sparkles className="size-4" />
              {analyzing ? "Analyzing…" : "Analyze"}
            </Button>
            <Button type="button" variant="outline" onClick={exportBrief}>
              <Download className="size-4" />
              Export brief
            </Button>
          </div>
        </div>
        {notice ? (
          <p className="text-sm text-[var(--signal)]">{notice}</p>
        ) : null}
        <Textarea
          value={recorder.transcript}
          onChange={(e) => recorder.setTranscript(e.target.value)}
          placeholder="Live speech-to-text appears here when the phone supports it. Otherwise stop to auto-transcribe, upload audio, or paste text."
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

      {reviewCandidates.length ? (
        <div className="mt-6">
          <AnalysisReview
            candidates={reviewCandidates}
            onChange={(candidates) => void updateCandidates(candidates)}
            onApplyAccepted={() => void applyAccepted()}
          />
        </div>
      ) : null}

      <section className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Saved interviews
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              All sessions for this pack ({sessions.length}). Open one to edit,
              or add another — they stay on{" "}
              {pack.name || "this pack"}.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={recorder.recording || saving}
            onClick={startAdditionalInterview}
          >
            <Plus className="size-4" />
            Add another interview
          </Button>
        </div>
        {!ready ? (
          <p className="text-sm text-[var(--ink-muted)]">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No recordings yet for this pack. Start recording or upload audio
            above.
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
