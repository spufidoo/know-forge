/**
 * @deprecated Prefer `@/lib/data-store` — kept as a compatibility façade.
 * Interview persistence routes through the active KnowledgeDataBackend
 * (default: browser-local → tribal.interviews.v1 IndexedDB).
 */
export {
  listInterviewSessions,
  listAllInterviewSessions,
  getInterviewSession,
  saveInterviewSession,
  deleteInterviewSession,
} from "@/lib/data-store"

export function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
