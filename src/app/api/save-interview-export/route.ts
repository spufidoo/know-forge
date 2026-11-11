import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { requireIdentity } from "../../../../cursor/identity"

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

/** Safe single path segment: UUID or similar id — no separators or traversal. */
const SAFE_SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

function resolveInterviewDir(sessionId: string): string | null {
  if (!SAFE_SESSION_ID.test(sessionId)) return null
  if (sessionId === "." || sessionId === "..") return null

  const interviewsRoot = path.resolve(process.cwd(), "public", "interviews")
  const dir = path.resolve(interviewsRoot, sessionId)
  const relative = path.relative(interviewsRoot, dir)
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative.includes(`..${path.sep}`)
  ) {
    return null
  }
  return dir
}

export async function POST(request: Request) {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  let body: ExportBody
  try {
    body = (await request.json()) as ExportBody
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 })
  }

  const rawId = (body.sessionId || "").trim()
  const sessionId = rawId || crypto.randomUUID()
  const transcript = (body.transcript || "").trim()
  if (!transcript) {
    return Response.json({ error: "Missing transcript." }, { status: 400 })
  }

  const dir = resolveInterviewDir(sessionId)
  if (!dir) {
    return Response.json(
      { error: "Invalid sessionId." },
      { status: 400 },
    )
  }

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
