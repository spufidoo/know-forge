import type {
  InterviewSessionMeta,
  InterviewSessionRecord,
} from "@/lib/interview-types"
import type { KnowledgeStore } from "@/lib/types"
import type { SaveStoreResult } from "@/lib/data-store/types"

export function emptyStore(): KnowledgeStore {
  return { version: 1, packs: [] }
}

export function parseKnowledgeStore(raw: unknown): KnowledgeStore {
  if (!raw || typeof raw !== "object") return emptyStore()
  const parsed = raw as KnowledgeStore
  if (parsed.version !== 1 || !Array.isArray(parsed.packs)) return emptyStore()
  return parsed
}

export function toSessionMeta(
  row: InterviewSessionRecord,
): InterviewSessionMeta {
  return {
    id: row.id,
    packId: row.packId,
    title: row.title,
    expertName: row.expertName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    durationMs: row.durationMs,
    status: row.status,
    mimeType: row.mimeType,
    hasAudio: Boolean(row.audioBlob) || row.hasAudio,
    transcript: row.transcript,
    candidates: row.candidates,
  }
}

export function saveError(err: unknown, fallback: string): SaveStoreResult {
  if (err instanceof DOMException && err.name === "QuotaExceededError") {
    return { ok: false, error: "Browser storage is full — pack was not written." }
  }
  if (err instanceof Error) return { ok: false, error: err.message }
  return { ok: false, error: fallback }
}

/** Wire-friendly interview payload (Blob → base64). */
export type InterviewWire = Omit<InterviewSessionRecord, "audioBlob"> & {
  audioBase64?: string | null
  audioMimeType?: string | null
}

export async function sessionToWire(
  session: InterviewSessionRecord,
): Promise<InterviewWire> {
  const { audioBlob, ...meta } = session
  if (!audioBlob) {
    return { ...meta, audioBase64: null, audioMimeType: null }
  }
  const buffer = await audioBlob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  const audioBase64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64")
  return {
    ...meta,
    audioBase64,
    audioMimeType: audioBlob.type || meta.mimeType || "application/octet-stream",
  }
}

export function wireToSession(wire: InterviewWire): InterviewSessionRecord {
  const { audioBase64, audioMimeType, ...meta } = wire
  const record: InterviewSessionRecord = {
    ...meta,
    hasAudio: Boolean(audioBase64) || meta.hasAudio,
  }
  if (audioBase64) {
    const mime = audioMimeType || meta.mimeType || "application/octet-stream"
    if (typeof atob === "function") {
      const binary = atob(audioBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      record.audioBlob = new Blob([bytes], { type: mime })
    } else {
      const bytes = Buffer.from(audioBase64, "base64")
      record.audioBlob = new Blob([bytes], { type: mime })
    }
  }
  return record
}

export function sessionToMetaJson(session: InterviewSessionRecord): string {
  const { audioBlob: _blob, ...meta } = session
  return JSON.stringify({
    ...meta,
    hasAudio: Boolean(session.audioBlob) || session.hasAudio,
  })
}
