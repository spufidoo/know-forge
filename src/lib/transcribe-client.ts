export async function transcribeAudioFile(file: Blob, filename = "interview.webm") {
  const body = new FormData()
  body.append("file", file, filename)

  const res = await fetch("/api/transcribe", {
    method: "POST",
    body,
    credentials: "same-origin",
  })

  const json = (await res.json().catch(() => ({}))) as {
    text?: string
    error?: string
    code?: string
    reason?: string
    detail?: string
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        "Sign in required to transcribe audio. Open the app while signed in to Cursor, then try again.",
      )
    }
    const parts = [json.error, json.reason, json.detail].filter(
      (part): part is string => Boolean(part && part.trim()),
    )
    throw new Error(
      parts[0] ||
        `Local Whisper transcription failed (${res.status}).`,
    )
  }
  if (!json.text?.trim()) {
    throw new Error("Transcription returned no text.")
  }
  return json.text.trim()
}
