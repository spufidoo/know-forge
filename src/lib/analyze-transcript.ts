import { elicitationPrompts } from "./prompts"
import type { AnalysisCandidate } from "./interview-types"
import {
  emptyGotcha,
  emptyHeuristic,
  emptyProcedure,
  emptyTerm,
  type EntryKind,
  type GlossaryTerm,
  type Gotcha,
  type Heuristic,
  type KnowledgePack,
  type Procedure,
} from "./types"

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(normalize)
    .filter((s) => s.length > 24)
}

function confidenceFromLength(excerpt: string): AnalysisCandidate["confidence"] {
  if (excerpt.length > 160) return "high"
  if (excerpt.length > 80) return "medium"
  return "low"
}

function titleFrom(text: string, fallback: string) {
  const clean = normalize(text).replace(/^["'“”]+|["'“”]+$/g, "")
  if (!clean) return fallback
  return clean.length > 64 ? `${clean.slice(0, 61)}…` : clean
}

function makeCandidate(
  kind: EntryKind,
  title: string,
  excerpt: string,
  payload: Record<string, string | string[]>,
  confidence?: AnalysisCandidate["confidence"],
): AnalysisCandidate {
  return {
    id: crypto.randomUUID(),
    kind,
    title,
    excerpt,
    confidence: confidence ?? confidenceFromLength(excerpt),
    status: "pending",
    payload,
  }
}

function extractHeuristics(chunks: string[]): AnalysisCandidate[] {
  const out: AnalysisCandidate[] = []
  const re =
    /\b(?:when|if|whenever|once)\b[\s\S]{8,160}?\b(?:i|we|you|experts?|operators?)\b[\s\S]{0,40}?\b(?:always|usually|typically|should|tend to|do|don'?t|never|first)\b[\s\S]{8,180}/gi

  for (const chunk of chunks) {
    const matches = chunk.match(re) ?? []
    for (const match of matches.slice(0, 3)) {
      const parts = match.split(/\b(?:then|so i|so we|i (?:always|usually)|we (?:always|usually)|you should)\b/i)
      const when = normalize(parts[0] ?? match)
      const then = normalize(parts[1] ?? "Capture the expert move described here.")
      out.push(
        makeCandidate(
          "heuristic",
          titleFrom(when, "Heuristic from interview"),
          match,
          {
            title: titleFrom(when, "Heuristic from interview"),
            when,
            then,
            because: "Elicited from expert interview transcript.",
            unless: [],
            source: "Interview recording",
          },
        ),
      )
    }
  }
  return out
}

function extractProcedures(chunks: string[]): AnalysisCandidate[] {
  const out: AnalysisCandidate[] = []
  for (const chunk of chunks) {
    const stepMatches = [
      ...chunk.matchAll(
        /(?:^|\n|\.\s*)(?:\d+[.)]\s+|first[,:]?\s+|then[,:]?\s+|next[,:]?\s+|finally[,:]?\s+)([A-Z].{12,160}?)(?=(?:\n|\.\s*(?:\d+[.)]|then|next|finally)|$))/gi,
      ),
    ]
    if (stepMatches.length < 2) continue
    const steps = stepMatches.slice(0, 8).map((m) => normalize(m[1] ?? m[0]))
    out.push(
      makeCandidate(
        "procedure",
        titleFrom(steps[0] ?? "Procedure", "Procedure from interview"),
        chunk.slice(0, 240),
        {
          title: titleFrom(steps[0] ?? "Procedure", "Procedure from interview"),
          goal: "Reproduce the walkthrough captured in the interview.",
          whenToUse: "When facing the same class of situation the expert described.",
          whenNotToUse: "",
          steps: steps.join("\n"),
          source: "Interview recording",
        },
        "medium",
      ),
    )
  }
  return out
}

function extractGotchas(chunks: string[]): AnalysisCandidate[] {
  const out: AnalysisCandidate[] = []
  const cue =
    /\b(?:gotcha|trap|pitfall|false (?:positive|signal)|looks? (?:fine|healthy|green)|burned|bitten|actually failing|appears? (?:fine|healthy)|misleading)\b/i

  for (const chunk of chunks) {
    if (!cue.test(chunk)) continue
    const sentence = sentences(chunk).find((s) => cue.test(s)) ?? chunk.slice(0, 220)
    out.push(
      makeCandidate(
        "gotcha",
        titleFrom(sentence, "Gotcha from interview"),
        sentence,
        {
          title: titleFrom(sentence, "Gotcha from interview"),
          symptom: sentence,
          cause: "Cause still needs confirmation from the expert.",
          fix: "Capture the recovery move the expert recommended.",
          prevention: "Add the check or guardrail the expert mentioned.",
          source: "Interview recording",
        },
      ),
    )
  }
  return out
}

function extractTerms(chunks: string[]): AnalysisCandidate[] {
  const out: AnalysisCandidate[] = []
  const patterns = [
    /\b(?:we call (?:it|that)|known as|aka|stands for|means|referred to as)\s+["'“]?([A-Za-z][\w /-]{1,40})["'”]?\b/gi,
    /\b([A-Z]{2,8})\b(?:\s+(?:means|stands for|is))\s+(.{8,120}?)(?:\.|$)/g,
  ]

  for (const chunk of chunks) {
    for (const re of patterns) {
      re.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = re.exec(chunk))) {
        const term = normalize(match[1] ?? "")
        const definition = normalize(match[2] ?? match[0])
        if (term.length < 2) continue
        out.push(
          makeCandidate(
            "term",
            term,
            match[0],
            {
              term,
              definition:
                definition.length > term.length
                  ? definition
                  : "Definition captured from interview context — refine wording.",
              aliases: [],
              related: [],
              source: "Interview recording",
            },
            "medium",
          ),
        )
      }
    }
  }
  return out
}

function extractPromptAnchored(transcript: string): AnalysisCandidate[] {
  const lower = transcript.toLowerCase()
  const out: AnalysisCandidate[] = []

  for (const prompt of elicitationPrompts) {
    const needle = prompt.question.toLowerCase().slice(0, 48)
    const idx = lower.indexOf(needle)
    if (idx === -1) continue
    const after = transcript.slice(idx + prompt.question.length, idx + prompt.question.length + 500)
    const answer = sentences(after)[0] ?? normalize(after).slice(0, 240)
    if (!answer || answer.length < 28) continue

    if (prompt.kind === "heuristic") {
      out.push(
        makeCandidate(
          "heuristic",
          titleFrom(answer, prompt.question),
          answer,
          {
            title: titleFrom(answer, "Elicited heuristic"),
            when: "Cue described by the expert in response to the prompt.",
            then: answer,
            because: `Elicited from: "${prompt.question}"`,
            unless: [],
            source: "Interview recording",
          },
        ),
      )
    } else if (prompt.kind === "procedure") {
      out.push(
        makeCandidate(
          "procedure",
          titleFrom(answer, "Elicited procedure"),
          answer,
          {
            title: titleFrom(answer, "Elicited procedure"),
            goal: answer,
            whenToUse: `Responding to: "${prompt.question}"`,
            whenNotToUse: "",
            steps: answer,
            source: "Interview recording",
          },
        ),
      )
    } else if (prompt.kind === "gotcha") {
      out.push(
        makeCandidate(
          "gotcha",
          titleFrom(answer, "Elicited gotcha"),
          answer,
          {
            title: titleFrom(answer, "Elicited gotcha"),
            symptom: answer,
            cause: "",
            fix: "",
            prevention: "",
            source: "Interview recording",
          },
        ),
      )
    } else {
      out.push(
        makeCandidate(
          "term",
          titleFrom(answer, "Elicited term"),
          answer,
          {
            term: titleFrom(answer, "Term"),
            definition: answer,
            aliases: [],
            related: [],
            source: "Interview recording",
          },
        ),
      )
    }
  }

  return out
}

function dedupe(candidates: AnalysisCandidate[]) {
  const seen = new Set<string>()
  const out: AnalysisCandidate[] = []
  for (const c of candidates) {
    const key = `${c.kind}:${c.title.toLowerCase()}:${c.excerpt.slice(0, 80).toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

/** Offline, on-device analysis that turns interview speech into pack candidates. */
export function analyzeTranscript(transcript: string): AnalysisCandidate[] {
  const cleaned = normalize(transcript)
  if (cleaned.length < 40) return []

  const chunks = cleaned
    .split(/\n{2,}/)
    .map(normalize)
    .filter((c) => c.length > 40)
  const workingChunks = chunks.length ? chunks : [cleaned]

  return dedupe([
    ...extractPromptAnchored(cleaned),
    ...extractHeuristics(workingChunks),
    ...extractProcedures(workingChunks),
    ...extractGotchas(workingChunks),
    ...extractTerms(workingChunks),
  ]).slice(0, 24)
}

export function candidateToEntry(candidate: AnalysisCandidate) {
  const p = candidate.payload
  const str = (key: string) => String(p[key] ?? "")
  const list = (key: string) => {
    const value = p[key]
    if (Array.isArray(value)) return value.map(String).filter(Boolean)
    return String(value ?? "")
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  if (candidate.kind === "heuristic") {
    return emptyHeuristic({
      title: str("title") || candidate.title,
      when: str("when"),
      then: str("then"),
      because: str("because"),
      unless: list("unless"),
      confidence: candidate.confidence,
      source: str("source") || "Interview recording",
      tags: ["interview"],
    }) satisfies Heuristic
  }

  if (candidate.kind === "procedure") {
    const stepLines = list("steps")
    return emptyProcedure({
      title: str("title") || candidate.title,
      goal: str("goal"),
      whenToUse: str("whenToUse"),
      whenNotToUse: str("whenNotToUse"),
      source: str("source") || "Interview recording",
      tags: ["interview"],
      steps: (stepLines.length ? stepLines : [""]).map((action) => ({
        id: crypto.randomUUID(),
        action,
        check: "",
        note: "",
      })),
    }) satisfies Procedure
  }

  if (candidate.kind === "gotcha") {
    return emptyGotcha({
      title: str("title") || candidate.title,
      symptom: str("symptom"),
      cause: str("cause"),
      fix: str("fix"),
      prevention: str("prevention"),
      source: str("source") || "Interview recording",
      tags: ["interview"],
    }) satisfies Gotcha
  }

  return emptyTerm({
    term: str("term") || candidate.title,
    definition: str("definition"),
    aliases: list("aliases"),
    related: list("related"),
    source: str("source") || "Interview recording",
  }) satisfies GlossaryTerm
}

export function applyCandidatesToPack(
  pack: KnowledgePack,
  candidates: AnalysisCandidate[],
): KnowledgePack {
  let next = { ...pack }
  for (const candidate of candidates.filter((c) => c.status === "accepted")) {
    const entry = candidateToEntry(candidate)
    if (candidate.kind === "heuristic") {
      next = { ...next, heuristics: [entry as Heuristic, ...next.heuristics] }
    } else if (candidate.kind === "procedure") {
      next = { ...next, procedures: [entry as Procedure, ...next.procedures] }
    } else if (candidate.kind === "gotcha") {
      next = { ...next, gotchas: [entry as Gotcha, ...next.gotchas] }
    } else {
      next = { ...next, terms: [entry as GlossaryTerm, ...next.terms] }
    }
  }
  return next
}

export function buildAnalysisBrief(input: {
  packName: string
  expertName: string
  transcript: string
  candidates: AnalysisCandidate[]
}) {
  const pending = input.candidates.filter((c) => c.status !== "rejected")
  return [
    `# KE Studio interview analysis brief`,
    "",
    `Pack: ${input.packName || "Untitled pack"}`,
    `Expert: ${input.expertName || "Unnamed"}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    `Please deepen this elicitation into heuristics, procedures, gotchas, and glossary terms suitable for tribal.agent-pack/v1.`,
    "",
    "## Transcript",
    "",
    input.transcript.trim() || "_No transcript captured._",
    "",
    "## On-device candidate extractions",
    "",
    pending.length
      ? pending
          .map(
            (c, i) =>
              `${i + 1}. [${c.kind}/${c.confidence}] ${c.title}\n   Excerpt: ${c.excerpt}`,
          )
          .join("\n")
      : "_No candidates yet._",
    "",
  ].join("\n")
}
