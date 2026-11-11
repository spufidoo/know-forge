import { requireIdentity } from "../../../../cursor/identity"

const MAX_BYTES = 24 * 1024 * 1024
const ALLOWED_PREFIXES = ["audio/", "video/"]
const ALLOWED_EXTS = [".webm", ".mp3", ".mp4", ".m4a", ".wav", ".ogg", ".mpeg", ".mpga"]

function isAllowedFile(file: File) {
  const type = (file.type || "").toLowerCase()
  const name = file.name.toLowerCase()
  if (ALLOWED_PREFIXES.some((p) => type.startsWith(p))) return true
  return ALLOWED_EXTS.some((ext) => name.endsWith(ext))
}

/** Whisper keys off the filename extension — align it with the blob mime type. */
function whisperFilename(file: File): string {
  const mime = (file.type || "").toLowerCase()
  const original = (file.name || "").trim()
  const lowerName = original.toLowerCase()

  let ext = "webm"
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) {
    ext = "mp4"
  } else if (mime.includes("ogg") || (mime.includes("opus") && !mime.includes("webm"))) {
    ext = "ogg"
  } else if (mime.includes("mpeg") || mime.includes("mp3")) {
    ext = "mp3"
  } else if (mime.includes("wav")) {
    ext = "wav"
  } else if (mime.includes("webm")) {
    ext = "webm"
  } else {
    const fromName = ALLOWED_EXTS.find((candidate) => lowerName.endsWith(candidate))
    if (fromName) return original || `interview${fromName}`
  }

  const base =
    original.replace(/\.[^.]+$/, "").trim() ||
    "interview"
  return `${base}.${ext}`
}

export async function POST(request: Request) {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Server transcription is not configured. Set OPENAI_API_KEY, or paste a transcript manually.",
        code: "missing_key",
      },
      { status: 503 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: "Expected multipart form data." }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing audio file." }, { status: 400 })
  }
  if (!file.size) {
    return Response.json({ error: "Audio file is empty." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "Audio must be 24 MB or smaller." },
      { status: 400 },
    )
  }
  if (!isAllowedFile(file)) {
    return Response.json(
      {
        error:
          "Unsupported file type. Use webm, mp3, m4a, wav, ogg, or mp4 audio.",
      },
      { status: 400 },
    )
  }

  const body = new FormData()
  body.append("file", file, whisperFilename(file))
  body.append("model", "whisper-1")
  body.append("response_format", "json")

  const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  })

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "")
    return Response.json(
      {
        error: detail
          ? `Transcription request failed: ${detail.slice(0, 300)}`
          : "Transcription request failed.",
        detail: detail.slice(0, 500),
      },
      { status: 502 },
    )
  }

  const json = (await upstream.json()) as { text?: string }
  const text = (json.text ?? "").trim()
  if (!text) {
    return Response.json(
      {
        error:
          "Transcription returned no text. The audio may be silent, unsupported, or mislabeled.",
      },
      { status: 502 },
    )
  }

  return Response.json(
    { text },
    { headers: { "cache-control": "private, no-store" } },
  )
}

export async function GET(request: Request) {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  return Response.json(
    {
      configured: Boolean(process.env.OPENAI_API_KEY),
      maxBytes: MAX_BYTES,
    },
    { headers: { "cache-control": "private, no-store" } },
  )
}
