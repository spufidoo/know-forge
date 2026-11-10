"use client"

import { useTheme } from "@/components/theme-provider"
import { Switch } from "@/components/ui/switch"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const dark = theme === "dark"

  return (
    <div
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 shadow-[0_8px_24px_rgba(6,42,50,0.06)] backdrop-blur"
      }
    >
      <Sun
        className={`size-3.5 transition-colors ${dark ? "text-[var(--ink-faint)]" : "text-[var(--signal)]"}`}
        aria-hidden
      />
      <Switch
        size="sm"
        checked={dark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      />
      <Moon
        className={`size-3.5 transition-colors ${dark ? "text-[var(--signal)]" : "text-[var(--ink-faint)]"}`}
        aria-hidden
      />
    </div>
  )
}
