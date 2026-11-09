"use client"

import { Field } from "@/components/field"
import { TagInput } from "@/components/tag-input"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { GlossaryTerm } from "@/lib/types"

export function TermEditor({
  value,
  onChange,
}: {
  value: GlossaryTerm
  onChange: (next: GlossaryTerm) => void
}) {
  const patch = (partial: Partial<GlossaryTerm>) =>
    onChange({ ...value, ...partial, updatedAt: new Date().toISOString() })

  return (
    <div className="grid gap-4">
      <Field label="Term">
        <Input
          value={value.term}
          onChange={(e) => patch({ term: e.target.value })}
          placeholder="Blast radius"
        />
      </Field>
      <Field label="Definition">
        <Textarea
          value={value.definition}
          onChange={(e) => patch({ definition: e.target.value })}
          rows={4}
          placeholder="The set of users, regions, or dependent services affected…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Aliases">
          <TagInput
            value={value.aliases}
            onChange={(aliases) => patch({ aliases })}
            placeholder="impact scope"
          />
        </Field>
        <Field label="Related">
          <TagInput
            value={value.related}
            onChange={(related) => patch({ related })}
            placeholder="Sev, mitigation"
          />
        </Field>
      </div>
      <Field label="Source">
        <Input
          value={value.source}
          onChange={(e) => patch({ source: e.target.value })}
        />
      </Field>
    </div>
  )
}
