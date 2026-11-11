"use client"

import { ElicitationRail } from "@/components/elicitation-rail"
import { EmptyState } from "@/components/empty-state"
import { EntryList } from "@/components/entry-list"
import { ExportPanel } from "@/components/export-panel"
import { GotchaEditor } from "@/components/editors/gotcha-editor"
import { HeuristicEditor } from "@/components/editors/heuristic-editor"
import { ProcedureEditor } from "@/components/editors/procedure-editor"
import { TermEditor } from "@/components/editors/term-editor"
import { PackMetaForm } from "@/components/pack-meta-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  analyzeTranscript,
  applyCandidatesToPack,
} from "@/lib/analyze-transcript"
import {
  getInterviewSession,
  saveInterviewSession,
} from "@/lib/data-store"
import type { AnalysisCandidate } from "@/lib/interview-types"
import {
  emptyGotcha,
  emptyHeuristic,
  emptyProcedure,
  emptyTerm,
  packCounts,
  type EntryKind,
  type KnowledgePack,
} from "@/lib/types"
import { ArrowLeft, Check, Mic, Plus, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

function snapshotPack(pack: KnowledgePack) {
  return JSON.stringify(pack)
}

export function PackWorkspace({
  pack,
  onChange,
}: {
  pack: KnowledgePack
  onChange: (next: KnowledgePack) => void
}) {
  const [draft, setDraft] = useState(pack)
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotPack(pack))
  const dirty = snapshotPack(draft) !== savedSnapshot
  const counts = packCounts(draft)
  const [tab, setTab] = useState<EntryKind | "overview">("overview")
  const [selected, setSelected] = useState<Record<EntryKind, string | null>>({
    heuristic: pack.heuristics[0]?.id ?? null,
    procedure: pack.procedures[0]?.id ?? null,
    gotcha: pack.gotchas[0]?.id ?? null,
    term: pack.terms[0]?.id ?? null,
  })

  useEffect(() => {
    setDraft(pack)
    setSavedSnapshot(snapshotPack(pack))
    setSelected({
      heuristic: pack.heuristics[0]?.id ?? null,
      procedure: pack.procedures[0]?.id ?? null,
      gotcha: pack.gotchas[0]?.id ?? null,
      term: pack.terms[0]?.id ?? null,
    })
  }, [pack.id])

  const selectedHeuristic = useMemo(
    () => draft.heuristics.find((h) => h.id === selected.heuristic) ?? null,
    [draft.heuristics, selected.heuristic],
  )
  const selectedProcedure = useMemo(
    () => draft.procedures.find((p) => p.id === selected.procedure) ?? null,
    [draft.procedures, selected.procedure],
  )
  const selectedGotcha = useMemo(
    () => draft.gotchas.find((g) => g.id === selected.gotcha) ?? null,
    [draft.gotchas, selected.gotcha],
  )
  const selectedTerm = useMemo(
    () => draft.terms.find((t) => t.id === selected.term) ?? null,
    [draft.terms, selected.term],
  )

  const updateDraft = (next: KnowledgePack) => {
    setSaveNotice(null)
    setDraft({ ...next, updatedAt: new Date().toISOString() })
  }

  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const savedPack = useMemo(() => {
    try {
      return JSON.parse(savedSnapshot) as KnowledgePack
    } catch {
      return pack
    }
  }, [savedSnapshot, pack])

  const transcriptDirty =
    (draft.interview?.transcript ?? "").trim() !==
    (savedPack.interview?.transcript ?? "").trim()

  const stripInterviewDerived = (current: KnowledgePack): KnowledgePack => {
    const fromInterview = (entry: { source: string; tags?: string[] }) =>
      /interview/i.test(entry.source || "") ||
      /elicited from/i.test(entry.source || "") ||
      (entry.tags ?? []).some((tag) => /interview/i.test(tag))
    return {
      ...current,
      heuristics: current.heuristics.filter((h) => !fromInterview(h)),
      procedures: current.procedures.filter((p) => !fromInterview(p)),
      gotchas: current.gotchas.filter((g) => !fromInterview(g)),
      terms: current.terms.filter((t) => !fromInterview(t)),
    }
  }

  const analyzePackTranscript = async () => {
    const transcript = (draft.interview?.transcript ?? "").trim()
    if (transcript.length < 40) {
      setSaveNotice("Need a longer transcript before analysis.")
      return
    }
    setAnalyzing(true)
    setSaveNotice("Analyzing transcript…")
    try {
      const candidates = analyzeTranscript(transcript).map(
        (c) =>
          ({
            ...c,
            status: "accepted",
          }) as AnalysisCandidate,
      )
      const cleared = stripInterviewDerived(draft)
      const next = applyCandidatesToPack(cleared, candidates)
      const stamped = {
        ...next,
        interview: draft.interview
          ? { ...draft.interview, transcript }
          : draft.interview,
        updatedAt: new Date().toISOString(),
      }
      updateDraft(stamped)

      const sessionId = stamped.interview?.sessionId
      if (sessionId) {
        const existing = await getInterviewSession(sessionId)
        if (existing) {
          await saveInterviewSession({
            ...existing,
            packId: stamped.id,
            transcript,
            candidates,
            updatedAt: stamped.updatedAt,
          })
        }
      }

      setSaveNotice(
        candidates.length
          ? `Analyzed transcript — refreshed ${candidates.length} interview-sourced entries. Confirm save to persist.`
          : "Analyze finished with no structured candidates. Edit the transcript and try again.",
      )
      setTab("overview")
    } finally {
      setAnalyzing(false)
    }
  }

  const confirmSave = async () => {
    setSaving(true)
    setSaveNotice("Saving…")
    const stamped = { ...draft, updatedAt: new Date().toISOString() }
    onChange(stamped)
    setDraft(stamped)
    setSavedSnapshot(snapshotPack(stamped))

    const interview = stamped.interview
    if (!interview?.sessionId) {
      setSaveNotice("Pack saved.")
      setSaving(false)
      return
    }

    try {
      const existing = await getInterviewSession(interview.sessionId)
      if (existing) {
        await saveInterviewSession({
          ...existing,
          packId: stamped.id,
          title: interview.title || existing.title,
          expertName: interview.expertName || existing.expertName,
          transcript: interview.transcript,
          updatedAt: stamped.updatedAt,
        })
      }

      const exportRes = await fetch("/api/save-interview-export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          sessionId: interview.sessionId,
          packId: stamped.id,
          title: interview.title || stamped.name,
          expertName: interview.expertName,
          transcript: interview.transcript || "[empty]",
          mimeType: interview.mimeType,
          durationMs: interview.durationMs,
          candidates: existing?.candidates ?? [],
        }),
      })
      if (!exportRes.ok) {
        setSaveNotice(
          "Pack + session saved; workspace transcript.txt sync failed.",
        )
        return
      }
      setSaveNotice(
        existing
          ? "Saved pack, IndexedDB session, and workspace transcript."
          : "Saved pack and workspace transcript (no IndexedDB session found for that id).",
      )
    } catch {
      setSaveNotice(
        "Pack saved; could not sync transcript to IndexedDB/workspace.",
      )
    } finally {
      setSaving(false)
    }
  }

  const cancelEdits = () => {
    const restored = JSON.parse(savedSnapshot) as KnowledgePack
    setSaveNotice(null)
    setDraft(restored)
    setSelected({
      heuristic: restored.heuristics[0]?.id ?? null,
      procedure: restored.procedures[0]?.id ?? null,
      gotcha: restored.gotchas[0]?.id ?? null,
      term: restored.terms[0]?.id ?? null,
    })
  }

  const addHeuristic = (prompt?: string) => {
    const entry = emptyHeuristic({
      title: "",
      because: prompt ? `Elicited from: "${prompt}"` : "",
    })
    updateDraft({ ...draft, heuristics: [entry, ...draft.heuristics] })
    setSelected((s) => ({ ...s, heuristic: entry.id }))
    setTab("heuristic")
  }

  const addProcedure = (prompt?: string) => {
    const entry = emptyProcedure({
      title: "",
      goal: prompt ? `Responding to: "${prompt}"` : "",
    })
    updateDraft({ ...draft, procedures: [entry, ...draft.procedures] })
    setSelected((s) => ({ ...s, procedure: entry.id }))
    setTab("procedure")
  }

  const addGotcha = (prompt?: string) => {
    const entry = emptyGotcha({
      title: "",
      symptom: prompt ? `Prompt: ${prompt}` : "",
    })
    updateDraft({ ...draft, gotchas: [entry, ...draft.gotchas] })
    setSelected((s) => ({ ...s, gotcha: entry.id }))
    setTab("gotcha")
  }

  const addTerm = (prompt?: string) => {
    const entry = emptyTerm({
      term: "",
      definition: prompt ? `Elicited from: "${prompt}"` : "",
    })
    updateDraft({ ...draft, terms: [entry, ...draft.terms] })
    setSelected((s) => ({ ...s, term: entry.id }))
    setTab("term")
  }

  const onUsePrompt = (question: string, kind: EntryKind) => {
    if (kind === "heuristic") addHeuristic(question)
    if (kind === "procedure") addProcedure(question)
    if (kind === "gotcha") addGotcha(question)
    if (kind === "term") addTerm(question)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            <ArrowLeft className="size-3.5" />
            All packs
          </Link>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
              {draft.name || "Untitled pack"}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {draft.domain || "No domain set"} · {counts.total} entries
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          {dirty ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdits}
                disabled={saving}
              >
                <RotateCcw className="size-4" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void confirmSave()}
                disabled={saving}
              >
                <Check className="size-4" />
                {saving ? "Saving…" : "Confirm save"}
              </Button>
            </>
          ) : null}
          {saveNotice ? (
            <p
              className="max-w-xs text-sm text-[var(--signal)] sm:max-w-sm"
              role="status"
              aria-live="polite"
            >
              {saveNotice}
            </p>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/pack/${draft.id}/record`}>
              <Mic className="size-4" />
              Record / add interview
            </Link>
          </Button>
          <ExportPanel pack={draft} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as EntryKind | "overview")}
            orientation="horizontal"
            className="flex w-full min-w-0 flex-col gap-4"
          >
            <div className="relative z-10 w-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex h-9 w-max max-w-none flex-nowrap items-center justify-start gap-1">
                <TabsTrigger
                  value="overview"
                  className="h-7 shrink-0 flex-none px-2.5"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="heuristic"
                  className="h-7 shrink-0 flex-none px-2.5"
                >
                  Heuristics
                  <Badge variant="secondary" className="ml-1.5">
                    {counts.heuristics}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="procedure"
                  className="h-7 shrink-0 flex-none px-2.5"
                >
                  Procedures
                  <Badge variant="secondary" className="ml-1.5">
                    {counts.procedures}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="gotcha"
                  className="h-7 shrink-0 flex-none px-2.5"
                >
                  Gotchas
                  <Badge variant="secondary" className="ml-1.5">
                    {counts.gotchas}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="term"
                  className="h-7 shrink-0 flex-none px-2.5"
                >
                  Glossary
                  <Badge variant="secondary" className="ml-1.5">
                    {counts.terms}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-0 space-y-6">
              <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
                <h2 className="mb-4 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  Overview
                </h2>
                <PackMetaForm
                  value={draft}
                  onChange={updateDraft}
                  transcriptDirty={transcriptDirty}
                  analyzing={analyzing}
                  onAnalyzeTranscript={() => void analyzePackTranscript()}
                />
                {saveNotice ? (
                  <p className="mt-3 text-sm text-[var(--signal)]">{saveNotice}</p>
                ) : null}
              </section>
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Heuristics",
                    count: counts.heuristics,
                    blurb: "If-then judgment with exceptions",
                    action: () => addHeuristic(),
                  },
                  {
                    label: "Procedures",
                    count: counts.procedures,
                    blurb: "Ordered steps with checks",
                    action: () => addProcedure(),
                  },
                  {
                    label: "Gotchas",
                    count: counts.gotchas,
                    blurb: "Symptom → cause → fix",
                    action: () => addGotcha(),
                  },
                  {
                    label: "Glossary",
                    count: counts.terms,
                    blurb: "Shared dialect for agents",
                    action: () => addTerm(),
                  },
                ].map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={card.action}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left transition-colors hover:border-[var(--signal)]/40 hover:bg-[var(--signal-soft)]"
                  >
                    <div className="font-mono text-2xl text-[var(--signal)]">
                      {card.count}
                    </div>
                    <div className="mt-1 text-sm font-medium text-[var(--ink)]">
                      {card.label}
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {card.blurb}
                    </p>
                  </button>
                ))}
              </section>
            </TabsContent>

            <TabsContent value="heuristic">
              <KindPane
                title="Heuristics"
                onAdd={() => addHeuristic()}
                list={
                  <EntryList
                    items={draft.heuristics.map((h) => ({
                      id: h.id,
                      title: h.title,
                      subtitle: h.when || h.then,
                      meta: h.confidence,
                    }))}
                    selectedId={selected.heuristic}
                    onSelect={(id) =>
                      setSelected((s) => ({ ...s, heuristic: id }))
                    }
                    onDelete={(id) => {
                      const next = draft.heuristics.filter((h) => h.id !== id)
                      updateDraft({ ...draft, heuristics: next })
                      setSelected((s) => ({
                        ...s,
                        heuristic: next[0]?.id ?? null,
                      }))
                    }}
                    emptyLabel="No heuristics yet. Capture a when→then rule."
                  />
                }
                editor={
                  selectedHeuristic ? (
                    <HeuristicEditor
                      value={selectedHeuristic}
                      onChange={(entry) =>
                        updateDraft({
                          ...draft,
                          heuristics: draft.heuristics.map((h) =>
                            h.id === entry.id ? entry : h,
                          ),
                        })
                      }
                    />
                  ) : (
                    <EmptyState
                      title="Capture a heuristic"
                      body="Encode a rule of thumb: when you see X, do Y, because Z — unless these exceptions apply."
                      actionLabel="New heuristic"
                      onAction={() => addHeuristic()}
                    />
                  )
                }
              />
            </TabsContent>

            <TabsContent value="procedure">
              <KindPane
                title="Procedures"
                onAdd={() => addProcedure()}
                list={
                  <EntryList
                    items={draft.procedures.map((p) => ({
                      id: p.id,
                      title: p.title,
                      subtitle: p.goal,
                      meta: `${p.steps.length} steps`,
                    }))}
                    selectedId={selected.procedure}
                    onSelect={(id) =>
                      setSelected((s) => ({ ...s, procedure: id }))
                    }
                    onDelete={(id) => {
                      const next = draft.procedures.filter((p) => p.id !== id)
                      updateDraft({ ...draft, procedures: next })
                      setSelected((s) => ({
                        ...s,
                        procedure: next[0]?.id ?? null,
                      }))
                    }}
                    emptyLabel="No procedures yet. Capture a walkthrough as steps."
                  />
                }
                editor={
                  selectedProcedure ? (
                    <ProcedureEditor
                      value={selectedProcedure}
                      onChange={(entry) =>
                        updateDraft({
                          ...draft,
                          procedures: draft.procedures.map((p) =>
                            p.id === entry.id ? entry : p,
                          ),
                        })
                      }
                    />
                  ) : (
                    <EmptyState
                      title="Capture a procedure"
                      body="Turn an expert walkthrough into ordered actions with verification checks."
                      actionLabel="New procedure"
                      onAction={() => addProcedure()}
                    />
                  )
                }
              />
            </TabsContent>

            <TabsContent value="gotcha">
              <KindPane
                title="Gotchas"
                onAdd={() => addGotcha()}
                list={
                  <EntryList
                    items={draft.gotchas.map((g) => ({
                      id: g.id,
                      title: g.title,
                      subtitle: g.symptom || g.fix,
                    }))}
                    selectedId={selected.gotcha}
                    onSelect={(id) =>
                      setSelected((s) => ({ ...s, gotcha: id }))
                    }
                    onDelete={(id) => {
                      const next = draft.gotchas.filter((g) => g.id !== id)
                      updateDraft({ ...draft, gotchas: next })
                      setSelected((s) => ({
                        ...s,
                        gotcha: next[0]?.id ?? null,
                      }))
                    }}
                    emptyLabel="No gotchas yet. Capture a hard-won failure pattern."
                  />
                }
                editor={
                  selectedGotcha ? (
                    <GotchaEditor
                      value={selectedGotcha}
                      onChange={(entry) =>
                        updateDraft({
                          ...draft,
                          gotchas: draft.gotchas.map((g) =>
                            g.id === entry.id ? entry : g,
                          ),
                        })
                      }
                    />
                  ) : (
                    <EmptyState
                      title="Capture a gotcha"
                      body="Document traps that look fine until they aren't: symptom, cause, fix, prevention."
                      actionLabel="New gotcha"
                      onAction={() => addGotcha()}
                    />
                  )
                }
              />
            </TabsContent>

            <TabsContent value="term">
              <KindPane
                title="Glossary"
                onAdd={() => addTerm()}
                list={
                  <EntryList
                    items={draft.terms.map((t) => ({
                      id: t.id,
                      title: t.term,
                      subtitle: t.definition,
                    }))}
                    selectedId={selected.term}
                    onSelect={(id) => setSelected((s) => ({ ...s, term: id }))}
                    onDelete={(id) => {
                      const next = draft.terms.filter((t) => t.id !== id)
                      updateDraft({ ...draft, terms: next })
                      setSelected((s) => ({
                        ...s,
                        term: next[0]?.id ?? null,
                      }))
                    }}
                    emptyLabel="No terms yet. Capture local dialect."
                  />
                }
                editor={
                  selectedTerm ? (
                    <TermEditor
                      value={selectedTerm}
                      onChange={(entry) =>
                        updateDraft({
                          ...draft,
                          terms: draft.terms.map((t) =>
                            t.id === entry.id ? entry : t,
                          ),
                        })
                      }
                    />
                  ) : (
                    <EmptyState
                      title="Capture a term"
                      body="Encode jargon, aliases, and related concepts so agents speak your team's language."
                      actionLabel="New term"
                      onAction={() => addTerm()}
                    />
                  )
                }
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <ElicitationRail
            kind={tab === "overview" ? "all" : tab}
            onUsePrompt={onUsePrompt}
          />
        </div>
      </div>

      {dirty || saveNotice ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--panel)]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
            <p
              className={
                saveNotice && !dirty
                  ? "text-sm text-[var(--signal)]"
                  : "text-sm text-[var(--ink-muted)]"
              }
              role="status"
              aria-live="polite"
            >
              {dirty
                ? saving
                  ? "Saving…"
                  : "Unsaved changes in this pack."
                : saveNotice}
            </p>
            <div className="flex flex-wrap gap-2">
              {dirty ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdits}
                    disabled={saving}
                  >
                    <RotateCcw className="size-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void confirmSave()}
                    disabled={saving}
                  >
                    <Check className="size-4" />
                    {saving ? "Saving…" : "Confirm save"}
                  </Button>
                </>
              ) : saveNotice ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSaveNotice(null)}
                >
                  Dismiss
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function KindPane({
  title,
  onAdd,
  list,
  editor,
}: {
  title: string
  onAdd: () => void
  list: React.ReactNode
  editor: React.ReactNode
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {title}
          </h2>
          <Button type="button" size="sm" variant="outline" onClick={onAdd}>
            <Plus className="size-3.5" />
            New
          </Button>
        </div>
        {list}
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
        {editor}
      </div>
    </div>
  )
}

