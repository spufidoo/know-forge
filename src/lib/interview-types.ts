import type { EntryKind } from "./types"

export type InterviewStatus = "recording" | "ready" | "analyzed"

export type AnalysisCandidateStatus = "pending" | "accepted" | "rejected"

export type AnalysisCandidate = {
  id: string
  kind: EntryKind
  title: string
  excerpt: string
  confidence: "low" | "medium" | "high"
  status: AnalysisCandidateStatus
  /** Structured fields ready to map into pack editors */
  payload: Record<string, string | string[]>
}

export type InterviewSessionMeta = {
  id: string
  packId: string
  title: string
  expertName: string
  createdAt: string
  updatedAt: string
  durationMs: number
  status: InterviewStatus
  mimeType: string
  hasAudio: boolean
  transcript: string
  candidates: AnalysisCandidate[]
}

export type InterviewSessionRecord = InterviewSessionMeta & {
  audioBlob?: Blob
}

export function emptyInterviewSession(
  packId: string,
  partial?: Partial<InterviewSessionMeta>,
): InterviewSessionMeta {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    packId,
    title: "Expert interview",
    expertName: "",
    createdAt: now,
    updatedAt: now,
    durationMs: 0,
    status: "ready",
    mimeType: "",
    hasAudio: false,
    transcript: "",
    candidates: [],
    ...partial,
  }
}
