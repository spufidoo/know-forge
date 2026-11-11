"use client"

import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"
import { useEffect, useState } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false
  const media = window.matchMedia("(display-mode: standalone)")
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return media.matches || Boolean(nav.standalone)
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [dismissed, setDismissed] = useState(false)
  const [standalone] = useState(isStandaloneDisplay)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  if (standalone || dismissed || !deferred) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--ink)] p-4 text-[var(--mist)] shadow-[0_20px_50px_rgba(6,42,50,0.35)] sm:inset-x-auto sm:right-4 sm:left-auto sm:w-[22rem]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-display)] text-lg text-[var(--mist)]">
            Install KE Studio
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--mist)]/70">
            Add the interview recorder to your home screen for one-tap
            microphone access while talking with experts.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-[var(--signal)] text-[var(--ink)] hover:bg-[var(--signal)]/90"
              onClick={async () => {
                await deferred.prompt()
                await deferred.userChoice
                setDeferred(null)
              }}
            >
              <Download className="size-3.5" />
              Install app
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[var(--mist)] hover:bg-white/10 hover:text-[var(--mist)]"
              onClick={() => setDismissed(true)}
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss install banner"
          className="rounded-md p-1 text-[var(--mist)]/70 hover:bg-white/10 hover:text-[var(--mist)]"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
