export type Confidence = "low" | "medium" | "high"

export type Heuristic = {
  id: string
  title: string
  when: string
  then: string
  because: string
  unless: string[]
  confidence: Confidence
  tags: string[]
  source: string
  createdAt: string
  updatedAt: string
}

export type ProcedureStep = {
  id: string
  action: string
  check: string
  note: string
}

export type Procedure = {
  id: string
  title: string
  goal: string
  whenToUse: string
  whenNotToUse: string
  steps: ProcedureStep[]
  tags: string[]
  source: string
  createdAt: string
  updatedAt: string
}

export type Gotcha = {
  id: string
  title: string
  symptom: string
  cause: string
  fix: string
  prevention: string
  tags: string[]
  source: string
  createdAt: string
  updatedAt: string
}

export type GlossaryTerm = {
  id: string
  term: string
  definition: string
  aliases: string[]
  related: string[]
  source: string
  createdAt: string
  updatedAt: string
}

/** Workspace-backed interview assets attached to a knowledge pack. */
export type PackInterviewAssets = {
  sessionId: string
  /** Public URL path, e.g. /interviews/<id>/interview.weba */
  audioPath: string
  /** Public URL path, e.g. /interviews/<id>/transcript.txt */
  transcriptPath: string
  /** Inline transcript text for editors / export without a second fetch. */
  transcript: string
  mimeType: string
  durationMs: number
  title: string
  expertName: string
}

export type KnowledgePack = {
  id: string
  name: string
  domain: string
  purpose: string
  audience: string
  heuristics: Heuristic[]
  procedures: Procedure[]
  gotchas: Gotcha[]
  terms: GlossaryTerm[]
  /** Optional linked interview audio + transcript for this pack. */
  interview?: PackInterviewAssets | null
  createdAt: string
  updatedAt: string
}

export type KnowledgeStore = {
  version: 1
  packs: KnowledgePack[]
}

export type EntryKind = "heuristic" | "procedure" | "gotcha" | "term"

export function emptyHeuristic(partial?: Partial<Heuristic>): Heuristic {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: "",
    when: "",
    then: "",
    because: "",
    unless: [],
    confidence: "medium",
    tags: [],
    source: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function emptyProcedure(partial?: Partial<Procedure>): Procedure {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: "",
    goal: "",
    whenToUse: "",
    whenNotToUse: "",
    steps: [
      {
        id: crypto.randomUUID(),
        action: "",
        check: "",
        note: "",
      },
    ],
    tags: [],
    source: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function emptyGotcha(partial?: Partial<Gotcha>): Gotcha {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: "",
    symptom: "",
    cause: "",
    fix: "",
    prevention: "",
    tags: [],
    source: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function emptyTerm(partial?: Partial<GlossaryTerm>): GlossaryTerm {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    term: "",
    definition: "",
    aliases: [],
    related: [],
    source: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function emptyPack(partial?: Partial<KnowledgePack>): KnowledgePack {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: "",
    domain: "",
    purpose: "",
    audience: "agentic AI systems and human operators",
    heuristics: [],
    procedures: [],
    gotchas: [],
    terms: [],
    interview: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function packCounts(pack: KnowledgePack) {
  return {
    heuristics: pack.heuristics.length,
    procedures: pack.procedures.length,
    gotchas: pack.gotchas.length,
    terms: pack.terms.length,
    total:
      pack.heuristics.length +
      pack.procedures.length +
      pack.gotchas.length +
      pack.terms.length,
  }
}
