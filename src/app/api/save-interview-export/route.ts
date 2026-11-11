import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

type ExportBody = {
  sessionId?: string
  packId?: string
  title?: string
  expertName?: string
  transcript?: string
  mimeType?: string
  durationMs?: number
  candidates?: unknown
}

export async function POST(request: Request) {
  let body: ExportBody
  try {
    body = (await request.json()) as ExportBody
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 })
  }

  const sessionId = (body.sessionId || "").trim() || crypto.randomUUID()
  const transcript = (body.transcript || "").trim()
  if (!transcript) {
    return Response.json({ error: "Missing transcript." }, { status: 400 })
  }

  const dir = path.join(process.cwd(), "public", "interviews", sessionId)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, "transcript.txt"), `${transcript}\n`, "utf8")
  await writeFile(
    path.join(dir, "analysis.json"),
    `${JSON.stringify(
      {
        sessionId,
        packId: body.packId ?? null,
        title: body.title ?? "",
        expertName: body.expertName ?? "",
        mimeType: body.mimeType ?? "",
        durationMs: body.durationMs ?? 0,
        transcript,
        candidates: body.candidates ?? [],
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  )

  return Response.json({
    ok: true,
    sessionId,
    transcriptPath: `/interviews/${sessionId}/transcript.txt`,
    analysisPath: `/interviews/${sessionId}/analysis.json`,
  })
}
