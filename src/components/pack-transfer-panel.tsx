"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { saveInterviewSession } from "@/lib/data-store"
import {
  downloadPackTransfer,
  readPackTransferFile,
  type ParsedPackTransfer,
} from "@/lib/pack-transfer"
import type { KnowledgePack } from "@/lib/types"
import { Download, Upload } from "lucide-react"
import { useRef, useState } from "react"

type Props = {
  /** When set, Export downloads this pack; Import can replace it in place. */
  pack?: KnowledgePack
  onReplacePack?: (pack: KnowledgePack) => void
  onImportedPack?: (pack: KnowledgePack) => void
  /** Compact trigger label for toolbar use. */
  compact?: boolean
}

export function PackTransferPanel({
  pack,
  onReplacePack,
  onImportedPack,
  compact,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<ParsedPackTransfer | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const exportPack = async () => {
    if (!pack) return
    setBusy(true)
    setError(null)
    try {
      await downloadPackTransfer(pack)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.")
    } finally {
      setBusy(false)
    }
  }

  const onPickFile = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const parsed = await readPackTransferFile(file)
      setPending(parsed)
      setConfirmOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.")
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const applyImport = async (mode: "replace" | "as-new") => {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      let next = pending.pack
      if (mode === "replace" && pack) {
        next = {
          ...pending.pack,
          id: pack.id,
          createdAt: pack.createdAt || pending.pack.createdAt,
          updatedAt: new Date().toISOString(),
        }
        if (next.interview) {
          next = {
            ...next,
            interview: { ...next.interview },
          }
        }
        onReplacePack?.(next)
      } else {
        next = {
          ...pending.pack,
          id: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        }
        onImportedPack?.(next)
      }

      if (pending.interviewSession) {
        const session = {
          ...pending.interviewSession,
          packId: next.id,
          id: next.interview?.sessionId || pending.interviewSession.id,
          updatedAt: new Date().toISOString(),
        }
        await saveInterviewSession(session)
      }

      setConfirmOpen(false)
      setPending(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply import.")
    } finally {
      setBusy(false)
    }
  }

  const canReplace = Boolean(pack && onReplacePack)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pack ? (
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          disabled={busy}
          onClick={() => void exportPack()}
        >
          <Download className="size-4" />
          {compact ? "Export pack" : "Export full pack"}
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-4" />
        {compact ? "Import pack" : "Import full pack"}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json,.ke-pack.json"
        className="hidden"
        onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
      />

      {error ? (
        <p className="w-full text-sm text-[var(--signal)]" role="status">
          {error}
        </p>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import knowledge pack?</DialogTitle>
            <DialogDescription>
              Restores the entire pack from the file: metadata, every entry
              section, and linked interview data when included.
              {canReplace
                ? " Confirm to replace this pack’s current contents."
                : " Confirm to add it as a new pack."}
            </DialogDescription>
          </DialogHeader>
          {pending ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4 text-sm text-[var(--ink)]">
              <p className="font-[family-name:var(--font-display)] text-lg">
                {pending.summary.name || "Untitled pack"}
              </p>
              <p className="mt-2 text-[var(--ink-muted)]">
                {pending.summary.heuristics} heuristics ·{" "}
                {pending.summary.procedures} procedures ·{" "}
                {pending.summary.gotchas} gotchas · {pending.summary.terms}{" "}
                glossary terms
                {pending.summary.hasAudio ? " · interview audio included" : ""}
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setConfirmOpen(false)
                setPending(null)
              }}
            >
              Cancel
            </Button>
            {canReplace ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void applyImport("as-new")}
                >
                  Import as new pack
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void applyImport("replace")}
                >
                  Replace current pack
                </Button>
              </>
            ) : (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void applyImport("as-new")}
              >
                Import pack
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
