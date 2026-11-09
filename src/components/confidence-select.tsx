"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Confidence } from "@/lib/types"

export function ConfidenceSelect({
  value,
  onChange,
}: {
  value: Confidence
  onChange: (value: Confidence) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Confidence)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="high">High — repeatedly proven</SelectItem>
        <SelectItem value="medium">Medium — team consensus</SelectItem>
        <SelectItem value="low">Low — emerging / contested</SelectItem>
      </SelectContent>
    </Select>
  )
}
