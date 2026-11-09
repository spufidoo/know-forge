"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"

export type EntryListItem = {
  id: string
  title: string
  subtitle: string
  meta?: string
}

export function EntryList({
  items,
  selectedId,
  onSelect,
  onDelete,
  emptyLabel,
}: {
  items: EntryListItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  emptyLabel: string
}) {
  if (!items.length) {
    return (
      <p className="px-1 py-6 text-sm text-[var(--ink-muted)]">{emptyLabel}</p>
    )
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.id === selectedId
        return (
          <li key={item.id}>
            <div
              className={cn(
                "group flex items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors",
                active
                  ? "border-[var(--signal)]/40 bg-[var(--signal-soft)]"
                  : "border-transparent hover:border-[var(--line)] hover:bg-[var(--panel)]",
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelect(item.id)}
              >
                <div className="truncate text-sm font-medium text-[var(--ink)]">
                  {item.title || "Untitled"}
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                  {item.subtitle || "No detail yet"}
                </div>
                {item.meta ? (
                  <Badge variant="secondary" className="mt-2 font-mono text-[0.65rem]">
                    {item.meta}
                  </Badge>
                ) : null}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="opacity-60 group-hover:opacity-100"
                onClick={() => onDelete(item.id)}
                aria-label="Delete entry"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
