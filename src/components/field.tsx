import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {label}
        </Label>
        {hint ? (
          <span className="text-xs text-[var(--ink-faint)]">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  )
}
