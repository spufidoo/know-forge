"use client"

import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { KnowledgePack, PackInterviewAssets } from "@/lib/types"
import { Sparkles } from "lucide-react"

function emptyInterview(partial?: Partial<PackInterviewAssets>): PackInterviewAssets {
  return {
    sessionId: partial?.sessionId || crypto.randomUUID(),
    audioPath: partial?.audioPath || "",
    transcriptPath: partial?.transcriptPath || "",
    transcript: partial?.transcript || "",
    mimeType: partial?.mimeType || "audio/webm",
    durationMs: partial?.durationMs || 0,
    title: partial?.title || "",
    expertName: partial?.expertName || "",
  }
}

export function PackMetaForm({
  value,
  onChange,
  transcriptDirty = false,
  analyzing = false,
  onAnalyzeTranscript,
}: {
  value: KnowledgePack
  onChange: (next: KnowledgePack) => void
  transcriptDirty?: boolean
  analyzing?: boolean
  onAnalyzeTranscript?: () => void
}) {
  const patch = (partial: Partial<KnowledgePack>) =>
    onChange({ ...value, ...partial, updatedAt: new Date().toISOString() })

  const interview = value.interview ?? null

  const patchInterview = (partial: Partial<PackInterviewAssets>) => {
    const base = interview ?? emptyInterview({ title: value.name })
    const nextInterview = { ...base, ...partial }
    if (!nextInterview.transcriptPath && nextInterview.sessionId) {
      nextInterview.transcriptPath = `/interviews/${nextInterview.sessionId}/transcript.txt`
    }
    patch({ interview: nextInterview })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pack name">
          <Input
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="On-call incident triage"
          />
        </Field>
        <Field label="Domain">
          <Input
            value={value.domain}
            onChange={(e) => patch({ domain: e.target.value })}
            placeholder="Site reliability / production incidents"
          />
        </Field>
      </div>
      <Field label="Purpose" hint="How agents should apply this pack">
        <Textarea
          value={value.purpose}
          onChange={(e) => patch({ purpose: e.target.value })}
          rows={3}
          placeholder="Give an incident agent the judgment veterans use in the first 15 minutes…"
        />
      </Field>
      <Field label="Audience">
        <Input
          value={value.audience}
          onChange={(e) => patch({ audience: e.target.value })}
          placeholder="Pager-duty agents and human responders"
        />
      </Field>

      <Field
        label="Interview transcript"
        hint={
          interview?.transcriptPath
            ? `Edits save with Confirm save (IndexedDB session + ${interview.transcriptPath})`
            : "Edits save with Confirm save into the linked interview session when present"
        }
      >
        <div className="grid gap-3">
          {interview?.title || interview?.expertName ? (
            <p className="text-sm text-[var(--ink-muted)]">
              {[interview.title, interview.expertName].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {interview?.audioPath ? (
            <audio controls src={interview.audioPath} className="w-full" />
          ) : null}
          <Textarea
            value={interview?.transcript ?? ""}
            onChange={(e) => patchInterview({ transcript: e.target.value })}
            rows={8}
            placeholder="Paste or edit the interview transcript here…"
            className="bg-[var(--panel-2)]"
          />
          {transcriptDirty && onAnalyzeTranscript ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={onAnalyzeTranscript}
                disabled={
                  analyzing || !(interview?.transcript ?? "").trim().length
                }
              >
                <Sparkles className="size-4" />
                {analyzing ? "Analyzing…" : "Analyze transcript"}
              </Button>
              <p className="text-xs text-[var(--ink-muted)]">
                Rebuild heuristics, procedures, gotchas, and glossary from this
                transcript (interview-sourced entries are refreshed).
              </p>
            </div>
          ) : null}
          {!interview ? (
            <p className="text-xs text-[var(--ink-faint)]">
              No interview linked yet — typing here creates pack interview
              metadata. Prefer Record / add interview to capture audio sessions.
            </p>
          ) : null}
        </div>
      </Field>
    </div>
  )
}
