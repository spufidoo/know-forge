"use client"

import { ConfidenceSelect } from "@/components/confidence-select"
import { Field } from "@/components/field"
import { TagInput } from "@/components/tag-input"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Heuristic } from "@/lib/types"

export function HeuristicEditor({
  value,
  onChange,
}: {
  value: Heuristic
  onChange: (next: Heuristic) => void
}) {
  const patch = (partial: Partial<Heuristic>) =>
    onChange({ ...value, ...partial, updatedAt: new Date().toISOString() })

  return (
    <div className="grid gap-4">
      <Field label="Title" hint="Short name for retrieval">
        <Input
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Recent change bias"
        />
      </Field>
      <Field label="When" hint="Cue / condition">
        <Textarea
          value={value.when}
          onChange={(e) => patch({ when: e.target.value })}
          placeholder="Error rates spike within 30–90 minutes of a deploy…"
          rows={3}
        />
      </Field>
      <Field label="Then" hint="Action or judgment">
        <Textarea
          value={value.then}
          onChange={(e) => patch({ then: e.target.value })}
          placeholder="Treat the recent change as the primary suspect…"
          rows={3}
        />
      </Field>
      <Field label="Because" hint="Why this holds">
        <Textarea
          value={value.because}
          onChange={(e) => patch({ because: e.target.value })}
          placeholder="Most production incidents correlate with change…"
          rows={3}
        />
      </Field>
      <Field label="Unless" hint="Exceptions, one per line">
        <Textarea
          value={value.unless.join("\n")}
          onChange={(e) =>
            patch({
              unless: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder={
            "A dependency outage is already confirmed\nRollback risk exceeds incident impact"
          }
          rows={3}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Confidence">
          <ConfidenceSelect
            value={value.confidence}
            onChange={(confidence) => patch({ confidence })}
          />
        </Field>
        <Field label="Source">
          <Input
            value={value.source}
            onChange={(e) => patch({ source: e.target.value })}
            placeholder="Who or where this came from"
          />
        </Field>
      </div>
      <Field label="Tags">
        <TagInput
          value={value.tags}
          onChange={(tags) => patch({ tags })}
          placeholder="triage, deploy"
        />
      </Field>
    </div>
  )
}
