"use client"

import { Field } from "@/components/field"
import { TagInput } from "@/components/tag-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Procedure, ProcedureStep } from "@/lib/types"
import { Plus, Trash2 } from "lucide-react"

export function ProcedureEditor({
  value,
  onChange,
}: {
  value: Procedure
  onChange: (next: Procedure) => void
}) {
  const patch = (partial: Partial<Procedure>) =>
    onChange({ ...value, ...partial, updatedAt: new Date().toISOString() })

  const updateStep = (id: string, partial: Partial<ProcedureStep>) => {
    patch({
      steps: value.steps.map((s) => (s.id === id ? { ...s, ...partial } : s)),
    })
  }

  const addStep = () => {
    patch({
      steps: [
        ...value.steps,
        { id: crypto.randomUUID(), action: "", check: "", note: "" },
      ],
    })
  }

  const removeStep = (id: string) => {
    if (value.steps.length <= 1) return
    patch({ steps: value.steps.filter((s) => s.id !== id) })
  }

  return (
    <div className="grid gap-4">
      <Field label="Title">
        <Input
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="First-15 triage"
        />
      </Field>
      <Field label="Goal">
        <Textarea
          value={value.goal}
          onChange={(e) => patch({ goal: e.target.value })}
          placeholder="Decide mitigate vs. dig with a shared status…"
          rows={2}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Use when">
          <Textarea
            value={value.whenToUse}
            onChange={(e) => patch({ whenToUse: e.target.value })}
            rows={2}
          />
        </Field>
        <Field label="Do not use when">
          <Textarea
            value={value.whenNotToUse}
            onChange={(e) => patch({ whenNotToUse: e.target.value })}
            rows={2}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Steps
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addStep}>
            <Plus className="size-3.5" />
            Add step
          </Button>
        </div>
        <div className="space-y-3">
          {value.steps.map((step, index) => (
            <div
              key={step.id}
              className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--signal)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeStep(step.id)}
                  disabled={value.steps.length <= 1}
                  aria-label="Remove step"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="grid gap-3">
                <Field label="Action">
                  <Input
                    value={step.action}
                    onChange={(e) =>
                      updateStep(step.id, { action: e.target.value })
                    }
                    placeholder="Acknowledge the page and open the channel"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Check">
                    <Input
                      value={step.check}
                      onChange={(e) =>
                        updateStep(step.id, { check: e.target.value })
                      }
                      placeholder="How do you know it worked?"
                    />
                  </Field>
                  <Field label="Note">
                    <Input
                      value={step.note}
                      onChange={(e) =>
                        updateStep(step.id, { note: e.target.value })
                      }
                      placeholder="Optional nuance"
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
