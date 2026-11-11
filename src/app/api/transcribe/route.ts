import { requireIdentity } from "../../../../cursor/identity"
import {
  isLocalWhisperAvailable,
  transcribeWithLocalWhisper,
} from "@/lib/local-whisper"

const MAX_BYTES = 24 * 1024 * 1024
const ALLOWED_PREFIXES = ["audio/", "video/"]
const ALLOWED_EXTS = [
  ".webm",
  ".weba",
  ".mp3",
  ".mp4",
  ".m4a",
  ".wav",
  ".ogg",
  ".mpeg",
  ".mpga",
]

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
  } else if (lowerName.endsWith(".weba")) {
    ext = "weba"
  } else if (mime.includes("webm")) {
    ext = "webm"
  } else {
    const fromName = ALLOWED_EXTS.find((candidate) => lowerName.endsWith(candidate))
    if (fromName) return original || `interview${fromName}`
  }

  const base = original.replace(/\.[^.]+$/, "").trim() || "interview"
  return `${base}.${ext}`
}

export async function POST(request: Request) {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  const availability = await isLocalWhisperAvailable()
  if (!availability.available) {
    return Response.json(
      {
        error:
          availability.detail ||
          "Local Whisper is not available. Install openai-whisper for Python, then retry.",
        code: "missing_local_whisper",
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
          "Unsupported file type. Use webm, weba, mp3, m4a, wav, ogg, or mp4 audio.",
      },
      { status: 400 },
    )
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const text = await transcribeWithLocalWhisper({
      bytes,
      filename: whisperFilename(file),
      mimeType: file.type,
    })
    return Response.json(
      { text, engine: "local-whisper" },
      { headers: { "cache-control": "private, no-store" } },
    )
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Local Whisper failed."
    return Response.json(
      {
        error: detail,
        code: "local_whisper_failed",
      },
      { status: 502 },
    )
  }
}

export async function GET(request: Request) {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  const availability = await isLocalWhisperAvailable()
  return Response.json(
    {
      configured: availability.available,
      engine: "local-whisper",
      model: process.env.WHISPER_MODEL || "base",
      maxBytes: MAX_BYTES,
      detail: availability.detail,
    },
    { headers: { "cache-control": "private, no-store" } },
  )
}
