"use client"

import { Field } from "@/components/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { KnowledgePack } from "@/lib/types"

export function PackMetaForm({
  value,
  onChange,
}: {
  value: KnowledgePack
  onChange: (next: KnowledgePack) => void
}) {
  const patch = (partial: Partial<KnowledgePack>) =>
    onChange({ ...value, ...partial, updatedAt: new Date().toISOString() })

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
    </div>
  )
}
