import { RecordPageClient } from "@/components/interview/record-page-client"
import { Suspense } from "react"

async function RecordLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RecordPageClient id={id} />
}

export default function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-[var(--ink-muted)]">
          Opening interview mode…
        </div>
      }
    >
      <RecordLoader params={params} />
    </Suspense>
  )
}
