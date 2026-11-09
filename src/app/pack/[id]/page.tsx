import { PackPageClient } from "@/components/pack-page-client"
import { Suspense } from "react"

async function PackLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PackPageClient id={id} />
}

export default function PackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-[var(--ink-muted)]">
          Opening pack…
        </div>
      }
    >
      <PackLoader params={params} />
    </Suspense>
  )
}
