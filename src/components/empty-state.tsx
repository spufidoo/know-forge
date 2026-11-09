import { Button } from "@/components/ui/button"

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string
  body: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)]/60 px-6 py-10">
      <div className="space-y-2">
        <h3 className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)]">
          {title}
        </h3>
        <p className="max-w-md text-sm leading-relaxed text-[var(--ink-muted)]">
          {body}
        </p>
      </div>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  )
}
