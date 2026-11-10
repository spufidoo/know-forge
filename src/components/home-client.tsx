"use client"

import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { useKnowledgeStore } from "@/hooks/use-knowledge-store"
import { emptyPack, packCounts } from "@/lib/types"
import { ArrowRight, BookOpen, Mic, Plus, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function HomeClient() {
  const router = useRouter()
  const { packs, ready, savePack, deletePack, addSample } = useKnowledgeStore()

  const createPack = () => {
    const pack = emptyPack({
      name: "New knowledge pack",
      domain: "",
      purpose: "",
    })
    savePack(pack)
    router.push(`/pack/${pack.id}`)
  }

  const loadSample = () => {
    const pack = addSample()
    router.push(`/pack/${pack.id}`)
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(31,168,122,0.22),transparent_70%)] blur-2xl" />
        <div className="absolute right-0 top-20 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(6,42,50,0.18),transparent_68%)] blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,42,50,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6,42,50,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at 50% 20%, black 20%, transparent 75%)",
          }}
        />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]">
            Tribal
          </span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)] sm:inline">
            Knowledge elicitation
          </span>
        </div>
        <Button onClick={createPack}>
          <Plus className="size-4" />
          New pack
        </Button>
      </header>

      <section className="mx-auto grid min-h-[72vh] w-full max-w-6xl items-center gap-10 px-4 pb-10 pt-6 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pt-4">
        <div className="animate-rise">
          <p className="font-[family-name:var(--font-display)] text-5xl leading-[0.95] tracking-tight text-[var(--ink)] sm:text-6xl lg:text-7xl">
            Tribal
          </p>
          <h1 className="mt-5 max-w-xl text-2xl leading-snug text-[var(--ink)] sm:text-3xl">
            Encapsulate the judgment that never made the wiki.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--ink-muted)]">
            Elicit heuristics, procedures, gotchas, and glossary terms into
            agent-ready knowledge packs — or record expert conversations on
            Android and extract the judgment into structured memory.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={createPack}>
              Start eliciting
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={loadSample}>
              <Sparkles className="size-4" />
              Load sample pack
            </Button>
          </div>
          <p className="mt-4 max-w-lg text-sm text-[var(--ink-muted)]">
            On Android Chrome: open the site menu → <span className="text-[var(--ink)]">Install app</span>{" "}
            for a full-screen recorder with microphone access.
          </p>
        </div>

        <div className="animate-rise-delay relative overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--ink)] p-6 text-[var(--mist)] shadow-[0_30px_80px_rgba(6,42,50,0.25)] sm:p-8">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(31,168,122,0.35),transparent_70%)]" />
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-[var(--signal)]">
            agent-pack / v1
          </p>
          <pre className="relative mt-4 overflow-hidden font-mono text-[0.72rem] leading-relaxed text-[var(--mist)]/90">
{`{
  "when": "errors spike after deploy",
  "then": "suspect the change first",
  "because": "most incidents follow change",
  "unless": ["upstream outage confirmed"]
}`}
          </pre>
          <p className="relative mt-6 text-sm leading-relaxed text-[var(--mist)]/70">
            Export JSON for tool loaders or Markdown for RAG and system prompts.
            Keep the expertise portable.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              Knowledge packs
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              Stored locally in this browser.
            </p>
          </div>
        </div>

        {!ready ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-8 text-sm text-[var(--ink-muted)]">
            Loading packs…
          </div>
        ) : packs.length === 0 ? (
          <EmptyState
            title="No packs yet"
            body="Create a pack for a domain, then interview an expert with the elicitation prompts. Or load the on-call sample to see the shape."
            actionLabel="Create your first pack"
            onAction={createPack}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {packs.map((pack) => {
              const counts = packCounts(pack)
              return (
                <li key={pack.id}>
                  <div className="group rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 transition-colors hover:border-[var(--signal)]/35">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 shrink-0 text-[var(--signal)]" />
                          <h3 className="truncate font-medium text-[var(--ink)]">
                            {pack.name || "Untitled pack"}
                          </h3>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">
                          {pack.domain || "No domain"} · {counts.total} entries
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                      {pack.purpose || "No purpose set yet."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button asChild size="sm">
                        <Link href={`/pack/${pack.id}`}>Open</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/pack/${pack.id}/record`}>
                          <Mic className="size-3.5" />
                          Record
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePack(pack.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
