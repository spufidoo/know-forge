"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  downloadText,
  slugify,
  toAgentMarkdown,
  toAgentPack,
} from "@/lib/export"
import type { KnowledgePack } from "@/lib/types"
import { Check, Copy, Download } from "lucide-react"
import { useMemo, useState } from "react"

export function ExportPanel({ pack }: { pack: KnowledgePack }) {
  const [copied, setCopied] = useState<"json" | "md" | null>(null)
  const json = useMemo(
    () => JSON.stringify(toAgentPack(pack), null, 2),
    [pack],
  )
  const markdown = useMemo(() => toAgentMarkdown(pack), [pack])
  const base = slugify(pack.name)

  const copy = async (kind: "json" | "md", content: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 1500)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="size-4" />
          Export for agents
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agent pack export</DialogTitle>
          <DialogDescription>
            Structured JSON for tool loaders, or Markdown for RAG / system
            prompts. Schema: tribal.agent-pack/v1.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="json" className="min-h-0">
          <TabsList>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
          </TabsList>
          <TabsContent value="json" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  downloadText(`${base}.agent-pack.json`, json, "application/json")
                }
              >
                <Download className="size-3.5" />
                Download JSON
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy("json", json)}
              >
                {copied === "json" ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                Copy
              </Button>
            </div>
            <pre className="max-h-[50vh] overflow-auto rounded-xl border border-[var(--line)] bg-[var(--ink)] p-4 font-mono text-[0.72rem] leading-relaxed text-[var(--mist)]">
              {json}
            </pre>
          </TabsContent>
          <TabsContent value="markdown" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  downloadText(`${base}.agent-pack.md`, markdown, "text/markdown")
                }
              >
                <Download className="size-3.5" />
                Download Markdown
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy("md", markdown)}
              >
                {copied === "md" ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                Copy
              </Button>
            </div>
            <pre className="max-h-[50vh] overflow-auto rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4 font-mono text-[0.72rem] leading-relaxed text-[var(--ink)] whitespace-pre-wrap">
              {markdown}
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
