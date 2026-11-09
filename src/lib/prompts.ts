import type { EntryKind } from "./types"

export type ElicitationPrompt = {
  id: string
  kind: EntryKind
  question: string
  hint: string
}

export const elicitationPrompts: ElicitationPrompt[] = [
  {
    id: "h1",
    kind: "heuristic",
    question: "What do experts notice first that juniors miss?",
    hint: "Capture the cue (when) and the move (then).",
  },
  {
    id: "h2",
    kind: "heuristic",
    question: "When two options look equal, what tie-breaker do you use?",
    hint: "Rules of thumb often live in quiet preferences.",
  },
  {
    id: "h3",
    kind: "heuristic",
    question: "What would you tell an agent never to do in this domain?",
    hint: "Negative heuristics are as valuable as positive ones.",
  },
  {
    id: "p1",
    kind: "procedure",
    question: "Walk me through the first ten minutes of a hard case.",
    hint: "Turn the walkthrough into ordered steps with checks.",
  },
  {
    id: "p2",
    kind: "procedure",
    question: "What checklist do you run before calling something done?",
    hint: "Definition-of-done procedures travel well into agents.",
  },
  {
    id: "g1",
    kind: "gotcha",
    question: "What false signal has burned your team more than once?",
    hint: "Symptom → cause → fix → prevention.",
  },
  {
    id: "g2",
    kind: "gotcha",
    question: "What looks fine in the tools but is actually failing?",
    hint: "Observability gaps are classic tribal gotchas.",
  },
  {
    id: "t1",
    kind: "term",
    question: "Which words mean something special on this team?",
    hint: "Encode local jargon so agents speak the same dialect.",
  },
  {
    id: "t2",
    kind: "term",
    question: "What acronyms confuse outsiders or new hires?",
    hint: "Aliases and related terms help retrieval.",
  },
]

export function promptsFor(kind: EntryKind | "all") {
  if (kind === "all") return elicitationPrompts
  return elicitationPrompts.filter((p) => p.kind === kind)
}
