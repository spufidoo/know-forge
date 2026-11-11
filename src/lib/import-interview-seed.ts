import {
  analyzeTranscript,
  applyCandidatesToPack,
} from "@/lib/analyze-transcript"
import {
  getInterviewSession,
  loadStore,
  saveInterviewSession,
  saveStore,
  upsertPack,
} from "@/lib/data-store"
import type { AnalysisCandidate } from "@/lib/interview-types"
import { emptyPack, type KnowledgePack } from "@/lib/types"

export type InterviewSeedPayload = {
  seedId: string
  preferredPackId?: string
  sessionId: string
  audioPath: string
  mimeType: string
  durationMs: number
  title: string
  expertName: string
  persona: {
    role: string
    packName: string
    domain: string
    purpose: string
    audience: string
  }
  transcript: string
  qa: Array<{
    promptId: string
    kind: string
    question: string
    answer: string
  }>
  candidates: AnalysisCandidate[]
}

export type ImportSeedResult = {
  alreadyImported: boolean
  pack: KnowledgePack
  sessionId: string
  summary: string[]
}

function flagKey(seedId: string) {
  return `tribal.seed.imported.${seedId}`
}

export async function fetchInterviewSeed(): Promise<InterviewSeedPayload> {
  const res = await fetch("/seed/interview-seed.json", { cache: "no-store" })
  if (!res.ok) throw new Error(`Seed JSON missing (${res.status})`)
  return (await res.json()) as InterviewSeedPayload
}

export async function importInterviewSeed(options?: {
  force?: boolean
  packIdHint?: string
}): Promise<ImportSeedResult> {
  const seed = await fetchInterviewSeed()
  const key = flagKey(seed.seedId)
  const force = Boolean(options?.force)

  if (!force && localStorage.getItem(key) === "1") {
    const store = loadStore()
    const existing =
      store.packs.find((p) => p.id === (options?.packIdHint || seed.preferredPackId)) ??
      store.packs.find(
        (p) =>
          p.name === seed.persona.packName || p.domain === seed.persona.domain,
      ) ??
      store.packs[0]
    if (!existing) throw new Error("Seed marked imported but no pack found")
    return {
      alreadyImported: true,
      pack: existing,
      sessionId: seed.sessionId,
      summary: [
        `Session id: ${seed.sessionId}`,
        `Expert: ${seed.expertName}`,
        `Transcript length: ${seed.transcript.length} chars`,
      ],
    }
  }

  const audioRes = await fetch(seed.audioPath, { cache: "no-store" })
  if (!audioRes.ok) throw new Error(`Seed audio missing (${audioRes.status})`)
  const audioBlob = await audioRes.blob()

  const preferredPackId =
    options?.packIdHint ||
    seed.preferredPackId ||
    "f8ee2413-5146-4565-8c89-2dd0ea75bcc7"

  const store = loadStore()
  const now = new Date().toISOString()
  let pack: KnowledgePack =
    store.packs.find((p) => p.id === preferredPackId) ??
    store.packs[0] ??
    emptyPack({
      name: seed.persona.packName,
      domain: seed.persona.domain,
      purpose: seed.persona.purpose,
      audience: seed.persona.audience,
    })

  // Avoid duplicating the same interview-derived entries on re-import
  const withoutInterviewTagged = {
    ...pack,
    heuristics: pack.heuristics.filter(
      (h) => !String(h.source).includes(seed.sessionId),
    ),
    gotchas: pack.gotchas.filter(
      (g) => !String(g.source).includes(seed.sessionId),
    ),
    terms: pack.terms.filter((t) => !String(t.source).includes(seed.sessionId)),
  }

  const interviewAssets = {
    sessionId: seed.sessionId,
    audioPath: `/interviews/${seed.sessionId}/interview.weba`,
    transcriptPath: `/interviews/${seed.sessionId}/transcript.txt`,
    transcript: seed.transcript,
    mimeType: seed.mimeType,
    durationMs: seed.durationMs,
    title: seed.title,
    expertName: seed.expertName,
  }

  pack = {
    ...withoutInterviewTagged,
    name: seed.persona.packName || withoutInterviewTagged.name,
    domain: seed.persona.domain,
    purpose: seed.persona.purpose,
    audience: seed.persona.audience,
    interview: interviewAssets,
    updatedAt: now,
  }

  // Merge curated seed candidates with a fresh local analyzer pass (no OpenAI).
  const curated = seed.candidates.map((c) => ({
    ...c,
    status: c.status ?? "accepted",
  })) as AnalysisCandidate[]
  const extracted = analyzeTranscript(seed.transcript).map((c) => ({
    ...c,
    status: "pending" as const,
  }))
  const seen = new Set(
    curated.map(
      (c) =>
        `${c.kind}:${String(c.title).toLowerCase().slice(0, 48)}:${c.excerpt
          .slice(0, 64)
          .toLowerCase()}`,
    ),
  )
  const candidates: AnalysisCandidate[] = [...curated]
  for (const c of extracted) {
    const key = `${c.kind}:${String(c.title).toLowerCase().slice(0, 48)}:${c.excerpt
      .slice(0, 64)
      .toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push(c)
  }

  pack = applyCandidatesToPack(pack, candidates)
  saveStore({ version: 1, packs: upsertPack(store.packs, pack) })

  const existingSession = await getInterviewSession(seed.sessionId)
  await saveInterviewSession({
    id: seed.sessionId,
    packId: pack.id,
    title: seed.title,
    expertName: seed.expertName,
    createdAt: existingSession?.createdAt ?? now,
    updatedAt: now,
    durationMs: seed.durationMs,
    status: "analyzed",
    mimeType: seed.mimeType,
    hasAudio: true,
    transcript: seed.transcript,
    candidates,
    audioBlob,
  })

  localStorage.setItem(key, "1")

  return {
    alreadyImported: false,
    pack,
    sessionId: seed.sessionId,
    summary: [
      `Pack: ${pack.name}`,
      `Domain: ${pack.domain}`,
      `Audience (persona): ${pack.audience}`,
      `Purpose: ${pack.purpose}`,
      `Expert name: ${seed.expertName}`,
      `Session title: ${seed.title}`,
      `Q&A: ${seed.qa.map((q) => q.question).join(" | ")}`,
      `Transcript saved (${seed.transcript.length} chars)`,
      `Audio blob saved (${audioBlob.size} bytes)`,
      `Pack interview audio: ${interviewAssets.audioPath}`,
      `Pack interview transcript: ${interviewAssets.transcriptPath}`,
      `Candidates applied: ${candidates.length}`,
      `Heuristics in pack: ${pack.heuristics.length}`,
      `Gotchas in pack: ${pack.gotchas.length}`,
      `Terms in pack: ${pack.terms.length}`,
    ],
  }
}
