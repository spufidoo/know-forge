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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  emptyGotcha,
  emptyHeuristic,
  emptyProcedure,
  emptyTerm,
  packCounts,
  type EntryKind,
  type KnowledgePack,
} from "@/lib/types"
import { ArrowLeft, Mic, Plus } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

export function PackWorkspace({
  pack,
  onChange,
}: {
  pack: KnowledgePack
  onChange: (next: KnowledgePack) => void
}) {
  const counts = packCounts(pack)
  const [tab, setTab] = useState<EntryKind | "overview">("overview")
  const [selected, setSelected] = useState<Record<EntryKind, string | null>>({
    heuristic: pack.heuristics[0]?.id ?? null,
    procedure: pack.procedures[0]?.id ?? null,
    gotcha: pack.gotchas[0]?.id ?? null,
    term: pack.terms[0]?.id ?? null,
  })
  const selectedHeuristic = useMemo(
    () => pack.heuristics.find((h) => h.id === selected.heuristic) ?? null,
    [pack.heuristics, selected.heuristic],
  )
  const selectedProcedure = useMemo(
    () => pack.procedures.find((p) => p.id === selected.procedure) ?? null,
    [pack.procedures, selected.procedure],
  )
  const selectedGotcha = useMemo(
    () => pack.gotchas.find((g) => g.id === selected.gotcha) ?? null,
    [pack.gotchas, selected.gotcha],
  )
  const selectedTerm = useMemo(
    () => pack.terms.find((t) => t.id === selected.term) ?? null,
    [pack.terms, selected.term],
  )

  const addHeuristic = (prompt?: string) => {
    const entry = emptyHeuristic({
      title: "",
      because: prompt ? `Elicited from: "${prompt}"` : "",
    })
    onChange({ ...pack, heuristics: [entry, ...pack.heuristics] })
    setSelected((s) => ({ ...s, heuristic: entry.id }))
    setTab("heuristic")
  }

  const addProcedure = (prompt?: string) => {
    const entry = emptyProcedure({
      title: "",
      goal: prompt ? `Responding to: "${prompt}"` : "",
    })
    onChange({ ...pack, procedures: [entry, ...pack.procedures] })
    setSelected((s) => ({ ...s, procedure: entry.id }))
    setTab("procedure")
  }

  const addGotcha = (prompt?: string) => {
    const entry = emptyGotcha({
      title: "",
      symptom: prompt ? `Prompt: ${prompt}` : "",
    })
    onChange({ ...pack, gotchas: [entry, ...pack.gotchas] })
    setSelected((s) => ({ ...s, gotcha: entry.id }))
    setTab("gotcha")
  }

  const addTerm = (prompt?: string) => {
    const entry = emptyTerm({
      term: "",
      definition: prompt ? `Elicited from: "${prompt}"` : "",
    })
    onChange({ ...pack, terms: [entry, ...pack.terms] })
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
              {pack.name || "Untitled pack"}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {pack.domain || "No domain set"} · {counts.total} entries
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/pack/${pack.id}/record`}>
              <Mic className="size-4" />
              Record interview
            </Link>
          </Button>
          <ExportPanel pack={pack} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as EntryKind | "overview")}
          >
            <TabsList className="mb-4 flex h-8 w-full flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="overview" className="h-7 flex-none px-2.5">
                Overview
              </TabsTrigger>
              <TabsTrigger value="heuristic" className="h-7 flex-none px-2.5">
                Heuristics
                <Badge variant="secondary" className="ml-1.5">
                  {counts.heuristics}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="procedure" className="h-7 flex-none px-2.5">
                Procedures
                <Badge variant="secondary" className="ml-1.5">
                  {counts.procedures}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="gotcha" className="h-7 flex-none px-2.5">
                Gotchas
                <Badge variant="secondary" className="ml-1.5">
                  {counts.gotchas}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="term" className="h-7 flex-none px-2.5">
                Glossary
                <Badge variant="secondary" className="ml-1.5">
                  {counts.terms}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
                <h2 className="mb-4 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  Pack framing
                </h2>
                <PackMetaForm value={pack} onChange={onChange} />
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
                    items={pack.heuristics.map((h) => ({
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
                      const next = pack.heuristics.filter((h) => h.id !== id)
                      onChange({ ...pack, heuristics: next })
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
                        onChange({
                          ...pack,
                          heuristics: pack.heuristics.map((h) =>
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
                    items={pack.procedures.map((p) => ({
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
                      const next = pack.procedures.filter((p) => p.id !== id)
                      onChange({ ...pack, procedures: next })
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
                        onChange({
                          ...pack,
                          procedures: pack.procedures.map((p) =>
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
                    items={pack.gotchas.map((g) => ({
                      id: g.id,
                      title: g.title,
                      subtitle: g.symptom || g.fix,
                    }))}
                    selectedId={selected.gotcha}
                    onSelect={(id) =>
                      setSelected((s) => ({ ...s, gotcha: id }))
                    }
                    onDelete={(id) => {
                      const next = pack.gotchas.filter((g) => g.id !== id)
                      onChange({ ...pack, gotchas: next })
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
                        onChange({
                          ...pack,
                          gotchas: pack.gotchas.map((g) =>
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
                    items={pack.terms.map((t) => ({
                      id: t.id,
                      title: t.term,
                      subtitle: t.definition,
                    }))}
                    selectedId={selected.term}
                    onSelect={(id) => setSelected((s) => ({ ...s, term: id }))}
                    onDelete={(id) => {
                      const next = pack.terms.filter((t) => t.id !== id)
                      onChange({ ...pack, terms: next })
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
                        onChange({
                          ...pack,
                          terms: pack.terms.map((t) =>
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
