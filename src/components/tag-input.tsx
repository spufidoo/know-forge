"use client"

import { Input } from "@/components/ui/input"
import { joinList, parseList } from "@/lib/parse-list"

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  return (
    <Input
      value={joinList(value)}
      onChange={(e) => onChange(parseList(e.target.value))}
      placeholder={placeholder ?? "comma-separated"}
    />
  )
}
