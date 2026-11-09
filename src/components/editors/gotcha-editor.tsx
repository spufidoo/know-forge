"use client"

import { Field } from "@/components/field"
import { TagInput } from "@/components/tag-input"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Gotcha } from "@/lib/types"

export function GotchaEditor({
  value,
  onChange,
}: {
  value: Gotcha
  onChange: (next: Gotcha) => void
}) {
  const patch = (partial: Partial<Gotcha>) =>
    onChange({ ...value, ...partial, updatedAt: new Date().toISOString() })

  return (
    <div className="grid gap-4">
      <Field label="Title">
        <Input
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Dashboard lag looks like recovery"
        />
      </Field>
      <Field label="Symptom" hint="What people see">
        <Textarea
          value={value.symptom}
          onChange={(e) => patch({ symptom: e.target.value })}
          rows={2}
        />
      </Field>
      <Field label="Cause" hint="What is actually happening">
        <Textarea
          value={value.cause}
          onChange={(e) => patch({ cause: e.target.value })}
          rows={2}
        />
      </Field>
      <Field label="Fix" hint="What to do now">
        <Textarea
          value={value.fix}
          onChange={(e) => patch({ fix: e.target.value })}
          rows={2}
        />
      </Field>
      <Field label="Prevention" hint="How to stop recurrence">
        <Textarea
          value={value.prevention}
          onChange={(e) => patch({ prevention: e.target.value })}
          rows={2}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tags">
          <TagInput value={value.tags} onChange={(tags) => patch({ tags })} />
        </Field>
        <Field label="Source">
          <Input
            value={value.source}
            onChange={(e) => patch({ source: e.target.value })}
          />
        </Field>
      </div>
    </div>
  )
}
