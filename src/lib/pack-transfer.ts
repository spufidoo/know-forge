import {
  sessionToWire,
  wireToSession,
  type InterviewWire,
} from "@/lib/data-store/shared"
import { getInterviewSession } from "@/lib/data-store"
import type { InterviewSessionRecord } from "@/lib/interview-types"
import {
  emptyPack,
  packCounts,
  type GlossaryTerm,
  type Gotcha,
  type Heuristic,
  type KnowledgePack,
  type PackInterviewAssets,
  type Procedure,
} from "@/lib/types"
import { downloadText, slugify } from "@/lib/export"

export const PACK_TRANSFER_SCHEMA = "ke-studio.knowledge-pack/v1" as const

/** Full portable knowledge pack — every field under the pack, plus linked interview session. */
export type KnowledgePackTransferDocument = {
  schema: typeof PACK_TRANSFER_SCHEMA
  exportedAt: string
  pack: KnowledgePack
  /** Linked interview session (audio as base64) when available on this device. */
  interviewSession: InterviewWire | null
}

export async function buildPackTransferDocument(
  pack: KnowledgePack,
): Promise<KnowledgePackTransferDocument> {
  let interviewSession: InterviewWire | null = null
  const sessionId = pack.interview?.sessionId
  if (sessionId) {
    try {
      const session = await getInterviewSession(sessionId)
      if (session) {
        interviewSession = await sessionToWire(session)
      }
    } catch {
      interviewSession = null
    }
  }

  return {
    schema: PACK_TRANSFER_SCHEMA,
    exportedAt: new Date().toISOString(),
    pack: structuredClone(pack),
    interviewSession,
  }
}

export async function downloadPackTransfer(pack: KnowledgePack) {
  const doc = await buildPackTransferDocument(pack)
  const json = JSON.stringify(doc, null, 2)
  downloadText(
    `${slugify(pack.name || "knowledge-pack")}.ke-pack.json`,
    json,
    "application/json",
  )
  return doc
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function normalizeHeuristic(raw: unknown): Heuristic | null {
  if (!raw || typeof raw !== "object") return null
  const h = raw as Record<string, unknown>
  const id = asString(h.id) || crypto.randomUUID()
  const now = new Date().toISOString()
  return {
    id,
    title: asString(h.title),
    when: asString(h.when),
    then: asString(h.then),
    because: asString(h.because),
    unless: asStringArray(h.unless),
    confidence:
      h.confidence === "low" || h.confidence === "high" || h.confidence === "medium"
        ? h.confidence
        : "medium",
    tags: asStringArray(h.tags),
    source: asString(h.source),
    createdAt: asString(h.createdAt, now),
    updatedAt: asString(h.updatedAt, now),
  }
}

function normalizeProcedure(raw: unknown): Procedure | null {
  if (!raw || typeof raw !== "object") return null
  const p = raw as Record<string, unknown>
  const id = asString(p.id) || crypto.randomUUID()
  const now = new Date().toISOString()
  const steps = Array.isArray(p.steps)
    ? p.steps
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => ({
          id: asString(s.id) || crypto.randomUUID(),
          action: asString(s.action),
          check: asString(s.check),
          note: asString(s.note),
        }))
    : []
  return {
    id,
    title: asString(p.title),
    goal: asString(p.goal),
    whenToUse: asString(p.whenToUse),
    whenNotToUse: asString(p.whenNotToUse),
    steps,
    tags: asStringArray(p.tags),
    source: asString(p.source),
    createdAt: asString(p.createdAt, now),
    updatedAt: asString(p.updatedAt, now),
  }
}

function normalizeGotcha(raw: unknown): Gotcha | null {
  if (!raw || typeof raw !== "object") return null
  const g = raw as Record<string, unknown>
  const id = asString(g.id) || crypto.randomUUID()
  const now = new Date().toISOString()
  return {
    id,
    title: asString(g.title),
    symptom: asString(g.symptom),
    cause: asString(g.cause),
    fix: asString(g.fix),
    prevention: asString(g.prevention),
    tags: asStringArray(g.tags),
    source: asString(g.source),
    createdAt: asString(g.createdAt, now),
    updatedAt: asString(g.updatedAt, now),
  }
}

function normalizeTerm(raw: unknown): GlossaryTerm | null {
  if (!raw || typeof raw !== "object") return null
  const t = raw as Record<string, unknown>
  const id = asString(t.id) || crypto.randomUUID()
  const now = new Date().toISOString()
  return {
    id,
    term: asString(t.term),
    definition: asString(t.definition),
    aliases: asStringArray(t.aliases),
    related: asStringArray(t.related),
    source: asString(t.source),
    createdAt: asString(t.createdAt, now),
    updatedAt: asString(t.updatedAt, now),
  }
}

function normalizeInterview(raw: unknown): PackInterviewAssets | null {
  if (raw == null) return null
  if (!raw || typeof raw !== "object") return null
  const i = raw as Record<string, unknown>
  const sessionId = asString(i.sessionId)
  if (!sessionId) return null
  return {
    sessionId,
    audioPath: asString(i.audioPath),
    transcriptPath: asString(i.transcriptPath),
    transcript: asString(i.transcript),
    mimeType: asString(i.mimeType),
    durationMs: typeof i.durationMs === "number" ? i.durationMs : 0,
    title: asString(i.title),
    expertName: asString(i.expertName),
  }
}

function normalizePack(raw: unknown): KnowledgePack {
  if (!raw || typeof raw !== "object") {
    throw new Error("Pack file is missing pack data.")
  }
  const p = raw as Record<string, unknown>
  const now = new Date().toISOString()
  const base = emptyPack({
    id: asString(p.id) || crypto.randomUUID(),
    name: asString(p.name, "Imported knowledge pack"),
    domain: asString(p.domain),
    purpose: asString(p.purpose),
    audience: asString(p.audience, "agentic AI systems and human operators"),
    createdAt: asString(p.createdAt, now),
    updatedAt: asString(p.updatedAt, now),
  })
  return {
    ...base,
    heuristics: Array.isArray(p.heuristics)
      ? p.heuristics.map(normalizeHeuristic).filter((x): x is Heuristic => !!x)
      : [],
    procedures: Array.isArray(p.procedures)
      ? p.procedures.map(normalizeProcedure).filter((x): x is Procedure => !!x)
      : [],
    gotchas: Array.isArray(p.gotchas)
      ? p.gotchas.map(normalizeGotcha).filter((x): x is Gotcha => !!x)
      : [],
    terms: Array.isArray(p.terms)
      ? p.terms.map(normalizeTerm).filter((x): x is GlossaryTerm => !!x)
      : [],
    interview: normalizeInterview(p.interview),
  }
}

export type ParsedPackTransfer = {
  pack: KnowledgePack
  interviewSession: InterviewSessionRecord | null
  summary: ReturnType<typeof packCounts> & { name: string; hasAudio: boolean }
}

/**
 * Accepts ke-studio.knowledge-pack/v1, a bare KnowledgePack object,
 * or a tribal.agent-pack/v1 document (best-effort restore).
 */
export function parsePackTransferJson(text: string): ParsedPackTransfer {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error("File is not valid JSON.")
  }
  if (!raw || typeof raw !== "object") {
    throw new Error("Pack file has an invalid shape.")
  }

  const doc = raw as Record<string, unknown>
  let pack: KnowledgePack
  let interviewSession: InterviewSessionRecord | null = null

  if (doc.schema === PACK_TRANSFER_SCHEMA && doc.pack) {
    pack = normalizePack(doc.pack)
    if (doc.interviewSession && typeof doc.interviewSession === "object") {
      try {
        interviewSession = wireToSession(doc.interviewSession as InterviewWire)
        interviewSession = { ...interviewSession, packId: pack.id }
      } catch {
        interviewSession = null
      }
    }
  } else if (doc.schema === "tribal.agent-pack/v1") {
    pack = agentPackToKnowledgePack(doc)
  } else if (
    Array.isArray(doc.heuristics) ||
    Array.isArray(doc.procedures) ||
    Array.isArray(doc.gotchas) ||
    Array.isArray(doc.terms)
  ) {
    pack = normalizePack(doc)
  } else {
    throw new Error(
      "Unrecognized pack format. Expected ke-studio.knowledge-pack/v1.",
    )
  }

  const counts = packCounts(pack)
  return {
    pack,
    interviewSession,
    summary: {
      name: pack.name,
      ...counts,
      hasAudio: Boolean(interviewSession?.audioBlob || pack.interview?.audioPath),
    },
  }
}

function agentPackToKnowledgePack(doc: Record<string, unknown>): KnowledgePack {
  const meta = (doc.pack && typeof doc.pack === "object"
    ? doc.pack
    : {}) as Record<string, unknown>
  const now = new Date().toISOString()
  const heuristics = Array.isArray(doc.heuristics)
    ? doc.heuristics
        .map((h) => {
          if (!h || typeof h !== "object") return null
          const row = h as Record<string, unknown>
          const rule =
            row.rule && typeof row.rule === "object"
              ? (row.rule as Record<string, unknown>)
              : {}
          return normalizeHeuristic({
            ...row,
            when: rule.when ?? row.when,
            then: rule.then ?? row.then,
            because: rule.because ?? row.because,
            unless: rule.unless ?? row.unless,
          })
        })
        .filter((x): x is Heuristic => !!x)
    : []
  const procedures = Array.isArray(doc.procedures)
    ? doc.procedures
        .map((p) => {
          if (!p || typeof p !== "object") return null
          const row = p as Record<string, unknown>
          const steps = Array.isArray(row.steps)
            ? row.steps.map((s) => {
                if (!s || typeof s !== "object") return null
                const step = s as Record<string, unknown>
                return {
                  id: crypto.randomUUID(),
                  action: asString(step.action),
                  check: asString(step.check),
                  note: asString(step.note),
                }
              }).filter(Boolean)
            : []
          return normalizeProcedure({ ...row, steps })
        })
        .filter((x): x is Procedure => !!x)
    : []
  const gotchas = Array.isArray(doc.gotchas)
    ? doc.gotchas.map(normalizeGotcha).filter((x): x is Gotcha => !!x)
    : []
  const glossary = Array.isArray(doc.glossary)
    ? doc.glossary
    : Array.isArray(doc.terms)
      ? doc.terms
      : []
  const terms = glossary.map(normalizeTerm).filter((x): x is GlossaryTerm => !!x)

  return emptyPack({
    id: asString(meta.id) || crypto.randomUUID(),
    name: asString(meta.name, "Imported agent pack"),
    domain: asString(meta.domain),
    purpose: asString(meta.purpose),
    audience: asString(meta.audience),
    heuristics,
    procedures,
    gotchas,
    terms,
    createdAt: now,
    updatedAt: now,
  })
}

export async function readPackTransferFile(
  file: File,
): Promise<ParsedPackTransfer> {
  const text = await file.text()
  return parsePackTransferJson(text)
}
