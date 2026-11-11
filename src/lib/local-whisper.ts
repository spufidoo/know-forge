import { spawn } from "node:child_process"
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const DEFAULT_MODEL = process.env.WHISPER_MODEL || "base"
const DEFAULT_LANGUAGE = process.env.WHISPER_LANGUAGE || "en"

function extensionForMime(mimeType: string | undefined, filename: string) {
  const mime = (mimeType || "").toLowerCase()
  const lower = filename.toLowerCase()
  if (mime.includes("wav") || lower.endsWith(".wav")) return "wav"
  if (mime.includes("mp4") || mime.includes("m4a") || lower.endsWith(".mp4") || lower.endsWith(".m4a"))
    return "mp4"
  if (mime.includes("mpeg") || mime.includes("mp3") || lower.endsWith(".mp3")) return "mp3"
  if ((mime.includes("ogg") || lower.endsWith(".ogg")) && !mime.includes("webm")) return "ogg"
  if (lower.endsWith(".weba")) return "weba"
  return "webm"
}

function runCommand(
  command: string,
  args: string[],
  opts?: { timeoutMs?: number },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    const timer =
      opts?.timeoutMs != null
        ? setTimeout(() => {
            child.kill()
            reject(new Error(`Command timed out after ${opts.timeoutMs}ms`))
          }, opts.timeoutMs)
        : null

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })
    child.on("error", (err) => {
      if (timer) clearTimeout(timer)
      reject(err)
    })
    child.on("close", (code) => {
      if (timer) clearTimeout(timer)
      resolve({ code: code ?? 1, stdout, stderr })
    })
  })
}

export async function isLocalWhisperAvailable(): Promise<{
  available: boolean
  python?: string
  detail?: string
}> {
  for (const python of ["python", "py"]) {
    try {
      const probe = await runCommand(python, ["-c", "import whisper; print('ok')"], {
        timeoutMs: 20_000,
      })
      if (probe.code === 0 && probe.stdout.includes("ok")) {
        return { available: true, python }
      }
    } catch (err) {
      // try next candidate
      void err
    }
  }
  return {
    available: false,
    detail:
      "Local openai-whisper not found. Install with: python -m pip install openai-whisper",
  }
}

export async function transcribeWithLocalWhisper(input: {
  bytes: Buffer
  filename: string
  mimeType?: string
}): Promise<string> {
  const availability = await isLocalWhisperAvailable()
  if (!availability.available || !availability.python) {
    throw new Error(
      availability.detail ||
        "Local Whisper is not available on this machine.",
    )
  }

  const script = path.join(process.cwd(), "scripts", "local-whisper-transcribe.py")
  const dir = await mkdtemp(path.join(tmpdir(), "ke-whisper-"))
  const ext = extensionForMime(input.mimeType, input.filename)
  const audioPath = path.join(dir, `interview.${ext}`)

  try {
    await writeFile(audioPath, input.bytes)
    const result = await runCommand(
      availability.python,
      [
        script,
        audioPath,
        "--model",
        DEFAULT_MODEL,
        "--language",
        DEFAULT_LANGUAGE,
      ],
      // Base model on CPU can be slow for longer clips.
      { timeoutMs: 10 * 60_000 },
    )

    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout || "").trim()
      throw new Error(
        detail || `Local Whisper failed with exit code ${result.code}`,
      )
    }

    const text = result.stdout.trim()
    if (!text) {
      // Some environments print progress on stderr and text only; also try sidecar txt if present.
      const sidecar = path.join(dir, "interview.txt")
      try {
        const fromFile = (await readFile(sidecar, "utf8")).trim()
        if (fromFile) return fromFile
      } catch {
        // ignore
      }
      throw new Error("Local Whisper returned no text.")
    }
    return text
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}
