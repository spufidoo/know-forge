/** Split comma/newline tagged input into unique trimmed strings. */
export function parseList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  )
}

export function joinList(items: string[]): string {
  return items.join(", ")
}
