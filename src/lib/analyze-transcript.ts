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

  // Contrast / triage rules common in ops walkthroughs ("one vs all", "local vs systemic").
  for (const chunk of chunks) {
    for (const sentence of sentences(chunk)) {
      const lower = sentence.toLowerCase()
      const contrast =
        /\b(?:splits?|separates?|distinguishes?)\b[\s\S]{0,80}\b(?:local|systemic|one|all)\b/i.test(
          sentence,
        ) ||
        /\b(?:one|single)\b[\s\S]{0,40}\b(?:region|system|instance)\b[\s\S]{0,40}\b(?:or|vs\.?|versus)\b[\s\S]{0,40}\b(?:all|every|multiple)\b/i.test(
          sentence,
        ) ||
        (/\blocal\b/i.test(sentence) && /\bsystemic\b/i.test(sentence))

      if (!contrast) continue
      out.push(
        makeCandidate(
          "heuristic",
          titleFrom(sentence, "Triage contrast heuristic"),
          sentence,
          {
            title: titleFrom(sentence, "Triage contrast heuristic"),
            when: "When scoping whether a failure is local or widespread",
            then: sentence,
            because: "Elicited from expert interview transcript.",
            unless: [],
            source: "Interview recording",
          },
          "high",
        ),
      )
    }

    // "I look at whether X" / "I check Y" as heuristic cues when not already covered.
    const lookRes =
      chunk.match(
        /\b(?:i|we)\s+(?:look at|check|verify)\s+whether\b[\s\S]{10,180}?(?:[.!?]|$)/gi,
      ) ?? []
    for (const match of lookRes.slice(0, 2)) {
      out.push(
        makeCandidate(
          "heuristic",
          titleFrom(match, "Check-whether heuristic"),
          match,
          {
            title: titleFrom(match, "Check-whether heuristic"),
            when: "During initial triage of the situation the expert described",
            then: normalize(match),
            because: "Elicited from expert interview transcript.",
            unless: [],
            source: "Interview recording",
          },
          "medium",
        ),
      )
    }
  }
  return out
}

function extractProcedures(chunks: string[]): AnalysisCandidate[] {
  const out: AnalysisCandidate[] = []
  for (const chunk of chunks) {
    // Allow ., ?, ! or start-of-chunk before First/Then/Next/Finally — spoken answers
    // often use "? Then …" rather than ". Then …".
    const stepMatches = [
      ...chunk.matchAll(
        /(?:^|[\n.!?]\s*)(?:\d+[.)]\s+|(?:first|then|next|finally)[,:]?\s+)([A-Za-z][\s\S]{8,180}?)(?=(?:[\n.!?]\s*(?:\d+[.)]|first|then|next|finally)\b|$))/gi,
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
    /\b(?:gotcha|trap|pitfall|false (?:positive|signal)|looks? (?:fine|healthy|green)|burned|bitten|actually failing|appears? (?:fine|healthy)|misleading|local problem|systemic|wrong (?:place|layer|layer)|mis-?scop)/i

  for (const chunk of chunks) {
    if (!cue.test(chunk)) continue
    const sentence =
      sentences(chunk).find((s) => cue.test(s)) ?? chunk.slice(0, 220)
    const lower = sentence.toLowerCase()
    const scopeTrap =
      /\blocal\b/.test(lower) && /\bsystemic\b/.test(lower)
    out.push(
      makeCandidate(
        "gotcha",
        titleFrom(
          scopeTrap
            ? "Treating a systemic outage as a local region problem"
            : sentence,
          "Gotcha from interview",
        ),
        sentence,
        {
          title: titleFrom(
            scopeTrap
              ? "Treating a systemic outage as a local region problem"
              : sentence,
            "Gotcha from interview",
          ),
          symptom: scopeTrap
            ? "Symptoms look like a single-region issue while multiple regions on the LPAR are affected."
            : sentence,
          cause: scopeTrap
            ? "Triage stopped at one region and missed shared infrastructure (coupling facility, shared database)."
            : "Cause still needs confirmation from the expert.",
          fix: scopeTrap
            ? "Compare one region versus all regions on the LPAR before deep-diving a single region."
            : "Capture the recovery move the expert recommended.",
          prevention: scopeTrap
            ? "Always check blast radius across regions on the LPAR after basic region health."
            : "Add the check or guardrail the expert mentioned.",
          source: "Interview recording",
        },
        scopeTrap ? "high" : undefined,
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

  // Domain nouns used in ops interviews — define from the surrounding sentence.
  const lexicon: Array<{
    term: string
    aliases: string[]
    re: RegExp
    fallback: string
  }> = [
    {
      term: "CICS",
      aliases: ["Customer Information Control System"],
      re: /\bCICS\b/i,
      fallback: "Transaction server regions running on z/OS that the expert is triaging.",
    },
    {
      term: "LPAR",
      aliases: ["L-PAR", "logical partition"],
      re: /\bL-?PAR\b/i,
      fallback:
        "Logical partition on IBM Z; comparing one region versus all regions on the LPAR separates local from systemic issues.",
    },
    {
      term: "CICS region",
      aliases: ["region"],
      re: /\b(?:CICS\s+)?regions?\b/i,
      fallback:
        "A CICS address space; first health checks ask whether it is up, taking transactions, and free of abends.",
    },
    {
      term: "Abend",
      aliases: ["abends", "abnormal end"],
      re: /\babends?\b/i,
      fallback: "Abnormal end messages in the CICS log checked during region health.",
    },
    {
      term: "Coupling facility",
      aliases: ["CF"],
      re: /\bcoupling facility\b/i,
      fallback:
        "Shared sysplex infrastructure; a candidate cause when every region on the LPAR is affected.",
    },
    {
      term: "Shared database",
      aliases: [],
      re: /\bshared database\b/i,
      fallback:
        "Database shared across regions; another systemic suspect when all regions on the LPAR fail together.",
    },
  ]

  const joined = chunks.join(" ")
  for (const entry of lexicon) {
    if (!entry.re.test(joined)) continue
    const sentence =
      sentences(joined).find((s) => entry.re.test(s)) ?? joined.slice(0, 180)
    out.push(
      makeCandidate(
        "term",
        entry.term,
        sentence,
        {
          term: entry.term,
          definition: `${entry.fallback} Context: ${sentence}`,
          aliases: entry.aliases,
          related: [],
          source: "Interview recording",
        },
        "medium",
      ),
    )
  }
  return out
}

function answerAfterPrompt(transcript: string, question: string, idx: number) {
  const after = normalize(
    transcript.slice(idx + question.length, idx + question.length + 700),
  )
  if (!after) return ""

  // Experts often lead with a short label ("Access path.") then explain.
  // Keep joining sentences until we have a usable excerpt.
  const parts = sentences(after)
  if (!parts.length) return after.slice(0, 320)

  let combined = parts[0] ?? ""
  for (let i = 1; i < parts.length && combined.length < 120; i += 1) {
    combined = normalize(`${combined} ${parts[i]}`)
  }
  return combined.slice(0, 420)
}

function extractOpenQuestions(transcript: string): AnalysisCandidate[] {
  const out: AnalysisCandidate[] = []
  const patterns: Array<{ re: RegExp; kind: "procedure" | "heuristic" }> = [
    {
      re: /what(?:'s| is) the first thing you (?:do|check|look at)\??/i,
      kind: "procedure",
    },
    {
      re: /walk me through\b[\s\S]{0,80}\?/i,
      kind: "procedure",
    },
    {
      re: /what do you (?:do|check|look at) first\??/i,
      kind: "procedure",
    },
  ]

  for (const { re, kind } of patterns) {
    const match = re.exec(transcript)
    if (!match || match.index == null) continue
    const answer = answerAfterPrompt(transcript, match[0], match.index)
    if (!answer || answer.length < 20) continue
    if (kind === "procedure") {
      out.push(
        makeCandidate(
          "procedure",
          titleFrom(answer, "First checks from interview"),
          answer,
          {
            title: titleFrom(answer, "First checks from interview"),
            goal: answer,
            whenToUse: `Responding to: "${normalize(match[0])}"`,
            whenNotToUse: "",
            steps: answer,
            source: "Interview recording",
          },
          "high",
        ),
      )
    } else {
      out.push(
        makeCandidate(
          "heuristic",
          titleFrom(answer, "Elicited heuristic"),
          answer,
          {
            title: titleFrom(answer, "Elicited heuristic"),
            when: "Cue described by the expert in response to the prompt.",
            then: answer,
            because: `Elicited from: "${normalize(match[0])}"`,
            unless: [],
            source: "Interview recording",
          },
        ),
      )
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
    const answer = answerAfterPrompt(transcript, prompt.question, idx)
    if (!answer || answer.length < 12) continue

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
    ...extractOpenQuestions(cleaned),
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
