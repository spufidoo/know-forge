import type {
  GlossaryTerm,
  Gotcha,
  Heuristic,
  KnowledgePack,
  Procedure,
} from "./types"
import { packCounts } from "./types"

export type AgentPackDocument = {
  schema: "tribal.agent-pack/v1"
  generatedAt: string
  pack: {
    id: string
    name: string
    domain: string
    purpose: string
    audience: string
    counts: ReturnType<typeof packCounts>
  }
  guidance: {
    howToUse: string[]
    priorityOrder: string[]
  }
  heuristics: Array<{
    id: string
    title: string
    rule: { when: string; then: string; because: string; unless: string[] }
    confidence: Heuristic["confidence"]
    tags: string[]
    source: string
  }>
  procedures: Array<{
    id: string
    title: string
    goal: string
    whenToUse: string
    whenNotToUse: string
    steps: Array<{ order: number; action: string; check: string; note: string }>
    tags: string[]
    source: string
  }>
  gotchas: Array<{
    id: string
    title: string
    symptom: string
    cause: string
    fix: string
    prevention: string
    tags: string[]
    source: string
  }>
  glossary: Array<{
    id: string
    term: string
    definition: string
    aliases: string[]
    related: string[]
    source: string
  }>
}

export function toAgentPack(pack: KnowledgePack): AgentPackDocument {
  return {
    schema: "tribal.agent-pack/v1",
    generatedAt: new Date().toISOString(),
    pack: {
      id: pack.id,
      name: pack.name,
      domain: pack.domain,
      purpose: pack.purpose,
      audience: pack.audience,
      counts: packCounts(pack),
    },
    guidance: {
      howToUse: [
        "Load this pack as durable domain memory before acting in the named domain.",
        "Prefer heuristics that match the current cues; treat unless-clauses as hard gates.",
        "Run procedures as ordered checklists; do not skip checks when stakes are high.",
        "When symptoms match a gotcha, apply the fix before inventing a novel diagnosis.",
        "Use glossary terms exactly; do not rename concepts mid-incident.",
      ],
      priorityOrder: [
        "gotchas matching live symptoms",
        "heuristics whose when-clause matches",
        "procedures for the active goal",
        "glossary for shared language",
      ],
    },
    heuristics: pack.heuristics.map((h) => ({
      id: h.id,
      title: h.title,
      rule: {
        when: h.when,
        then: h.then,
        because: h.because,
        unless: h.unless,
      },
      confidence: h.confidence,
      tags: h.tags,
      source: h.source,
    })),
    procedures: pack.procedures.map((p) => ({
      id: p.id,
      title: p.title,
      goal: p.goal,
      whenToUse: p.whenToUse,
      whenNotToUse: p.whenNotToUse,
      steps: p.steps.map((s, i) => ({
        order: i + 1,
        action: s.action,
        check: s.check,
        note: s.note,
      })),
      tags: p.tags,
      source: p.source,
    })),
    gotchas: pack.gotchas.map((g) => ({
      id: g.id,
      title: g.title,
      symptom: g.symptom,
      cause: g.cause,
      fix: g.fix,
      prevention: g.prevention,
      tags: g.tags,
      source: g.source,
    })),
    glossary: pack.terms.map((t) => ({
      id: t.id,
      term: t.term,
      definition: t.definition,
      aliases: t.aliases,
      related: t.related,
      source: t.source,
    })),
  }
}

function mdList(items: string[], empty = "_None captured._") {
  if (!items.length) return empty
  return items.map((i) => `- ${i}`).join("\n")
}

function heuristicMd(h: Heuristic) {
  return [
    `### ${h.title || "Untitled heuristic"}`,
    "",
    `**When:** ${h.when || "—"}`,
    `**Then:** ${h.then || "—"}`,
    `**Because:** ${h.because || "—"}`,
    `**Unless:**`,
    mdList(h.unless),
    "",
    `Confidence: \`${h.confidence}\`${h.tags.length ? ` · Tags: ${h.tags.map((t) => `\`${t}\``).join(", ")}` : ""}${h.source ? ` · Source: ${h.source}` : ""}`,
  ].join("\n")
}

function procedureMd(p: Procedure) {
  const steps = p.steps
    .map((s, i) => {
      const lines = [`${i + 1}. **${s.action || "Step"}**`]
      if (s.check) lines.push(`   - Check: ${s.check}`)
      if (s.note) lines.push(`   - Note: ${s.note}`)
      return lines.join("\n")
    })
    .join("\n")
  return [
    `### ${p.title || "Untitled procedure"}`,
    "",
    `**Goal:** ${p.goal || "—"}`,
    `**Use when:** ${p.whenToUse || "—"}`,
    `**Do not use when:** ${p.whenNotToUse || "—"}`,
    "",
    "**Steps**",
    steps || "_No steps._",
    "",
    `${p.tags.length ? `Tags: ${p.tags.map((t) => `\`${t}\``).join(", ")}` : ""}${p.source ? ` · Source: ${p.source}` : ""}`.trim(),
  ].join("\n")
}

function gotchaMd(g: Gotcha) {
  return [
    `### ${g.title || "Untitled gotcha"}`,
    "",
    `**Symptom:** ${g.symptom || "—"}`,
    `**Cause:** ${g.cause || "—"}`,
    `**Fix:** ${g.fix || "—"}`,
    `**Prevention:** ${g.prevention || "—"}`,
    "",
    `${g.tags.length ? `Tags: ${g.tags.map((t) => `\`${t}\``).join(", ")}` : ""}${g.source ? ` · Source: ${g.source}` : ""}`.trim(),
  ].join("\n")
}

function termMd(t: GlossaryTerm) {
  return [
    `### ${t.term || "Untitled term"}`,
    "",
    t.definition || "—",
    "",
    t.aliases.length ? `Aliases: ${t.aliases.join(", ")}` : "",
    t.related.length ? `Related: ${t.related.join(", ")}` : "",
    t.source ? `Source: ${t.source}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export function toAgentMarkdown(pack: KnowledgePack): string {
  const counts = packCounts(pack)
  const doc = toAgentPack(pack)
  return [
    `# ${pack.name || "Untitled knowledge pack"}`,
    "",
    `> Agent memory pack · schema \`${doc.schema}\``,
    "",
    `**Domain:** ${pack.domain || "—"}`,
    `**Purpose:** ${pack.purpose || "—"}`,
    `**Audience:** ${pack.audience || "—"}`,
    "",
    `Entries: ${counts.heuristics} heuristics · ${counts.procedures} procedures · ${counts.gotchas} gotchas · ${counts.terms} terms`,
    "",
    "## How agents should use this pack",
    mdList(doc.guidance.howToUse),
    "",
    "### Priority order",
    mdList(doc.guidance.priorityOrder),
    "",
    "## Heuristics",
    pack.heuristics.length
      ? pack.heuristics.map(heuristicMd).join("\n\n")
      : "_No heuristics captured._",
    "",
    "## Procedures",
    pack.procedures.length
      ? pack.procedures.map(procedureMd).join("\n\n")
      : "_No procedures captured._",
    "",
    "## Gotchas",
    pack.gotchas.length
      ? pack.gotchas.map(gotchaMd).join("\n\n")
      : "_No gotchas captured._",
    "",
    "## Glossary",
    pack.terms.length
      ? pack.terms.map(termMd).join("\n\n")
      : "_No terms captured._",
    "",
  ].join("\n")
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "knowledge-pack"
  )
}
