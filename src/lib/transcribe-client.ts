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
  }

  if (!res.ok) {
    throw new Error(json.error || `Transcription failed (${res.status})`)
  }
  if (!json.text?.trim()) {
    throw new Error("Transcription returned no text.")
  }
  return json.text.trim()
}
