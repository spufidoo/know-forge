"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return ""
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

function appendText(base: string, chunk: string) {
  const trimmed = chunk.trim()
  if (!trimmed) return base
  return `${base}${base && !base.endsWith(" ") ? " " : ""}${trimmed} `
}

function speechErrorMessage(code: string): string | null {
  switch (code) {
    case "not-allowed":
      return "Microphone or speech permission was denied."
    case "service-not-allowed":
      return "Speech recognition is blocked on this device or browser."
    case "network":
      return "Live transcription needs a network connection and failed to reach the speech service."
    case "audio-capture":
      return "No usable microphone was found for live transcription."
    case "language-not-supported":
      return "This browser does not support English live transcription."
    case "bad-grammar":
      return "Live transcription rejected the recognition settings."
    case "aborted":
      return null
    case "no-speech":
      return null
    default:
      return `Live transcription error: ${code}.`
  }
}

export function useInterviewRecorder() {
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [transcript, setTranscriptState] = useState("")
  const [interim, setInterimState] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [speechSupported] = useState(() => Boolean(getSpeechRecognition()))
  const [mimeType, setMimeType] = useState(() => pickMimeType())

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const accumulatedRef = useRef(0)
  const tickRef = useRef<number | null>(null)
  const shouldRestartSpeechRef = useRef(false)
  const transcriptRef = useRef("")
  const interimRef = useRef("")

  const setTranscript = useCallback((value: string | ((prev: string) => string)) => {
    setTranscriptState((prev) => {
      const next = typeof value === "function" ? value(prev) : value
      transcriptRef.current = next
      return next
    })
  }, [])

  const commitInterim = useCallback(() => {
    const chunk = interimRef.current.trim()
    if (!chunk) {
      interimRef.current = ""
      setInterimState("")
      return
    }
    const next = appendText(transcriptRef.current, chunk)
    transcriptRef.current = next
    setTranscriptState(next)
    interimRef.current = ""
    setInterimState("")
  }, [])

  const getTranscript = useCallback(() => {
    return `${transcriptRef.current} ${interimRef.current}`.replace(/\s+/g, " ").trim()
  }, [])

  useEffect(() => {
    return () => {
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
      shouldRestartSpeechRef.current = false
      const recognition = recognitionRef.current
      recognitionRef.current = null
      if (recognition) {
        recognition.onend = null
        recognition.onresult = null
        recognition.onerror = null
        try {
          recognition.stop()
        } catch {
          // already stopped
        }
      }
      stopTracks(streamRef.current)
      streamRef.current = null
    }
  }, [])

  const stopTicker = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  const cleanupStream = () => {
    stopTracks(streamRef.current)
    streamRef.current = null
  }

  const stopSpeech = (opts?: { commitInterim?: boolean }) => {
    if (opts?.commitInterim !== false) {
      commitInterim()
    }
    shouldRestartSpeechRef.current = false
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) return
    recognition.onend = null
    recognition.onresult = null
    recognition.onerror = null
    try {
      recognition.stop()
    } catch {
      // already stopped
    }
  }

  const startSpeech = () => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    stopSpeech({ commitInterim: false })
    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    shouldRestartSpeechRef.current = true

    recognition.onresult = (event) => {
      let finalChunk = ""
      let interimChunk = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ""
        if (result.isFinal) finalChunk += text
        else interimChunk += text
      }
      if (finalChunk) {
        const next = appendText(transcriptRef.current, finalChunk)
        transcriptRef.current = next
        setTranscriptState(next)
      }
      interimRef.current = interimChunk
      setInterimState(interimChunk)
    }

    recognition.onerror = (event) => {
      const message = speechErrorMessage(event.error)
      if (message) setError(message)
    }

    recognition.onend = () => {
      // Promote sticky interim before Chrome restarts a continuous session.
      commitInterim()
      if (shouldRestartSpeechRef.current) {
        try {
          recognition.start()
        } catch {
          // ignore restart races
        }
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setError("Live transcription could not start on this device.")
    }
  }

  const startTicker = () => {
    stopTicker()
    tickRef.current = window.setInterval(() => {
      if (startedAtRef.current == null) return
      setElapsedMs(accumulatedRef.current + (Date.now() - startedAtRef.current))
    }, 250)
  }

  const start = async () => {
    setError(null)
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("This browser cannot access the microphone.")
      return
    }
    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder is unavailable in this browser.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream
      chunksRef.current = []
      const type = pickMimeType()
      setMimeType(type)
      const recorder = type
        ? new MediaRecorder(stream, { mimeType: type })
        : new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      mediaRecorderRef.current = recorder
      recorder.start(1000)
      accumulatedRef.current = 0
      startedAtRef.current = Date.now()
      setElapsedMs(0)
      setRecording(true)
      setPaused(false)
      startTicker()
      startSpeech()
    } catch {
      cleanupStream()
      setError(
        "Could not open the microphone. Check Android permissions for this app.",
      )
    }
  }

  const pause = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== "recording") return
    recorder.pause()
    if (startedAtRef.current != null) {
      accumulatedRef.current += Date.now() - startedAtRef.current
      startedAtRef.current = null
    }
    stopTicker()
    stopSpeech()
    setPaused(true)
  }

  const resume = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== "paused") return
    recorder.resume()
    startedAtRef.current = Date.now()
    setPaused(false)
    startTicker()
    startSpeech()
  }

  const stop = async () =>
    new Promise<{ blob: Blob | null; durationMs: number; mimeType: string }>(
      (resolve) => {
        const recorder = mediaRecorderRef.current
        if (!recorder || recorder.state === "inactive") {
          stopSpeech()
          stopTicker()
          cleanupStream()
          setRecording(false)
          setPaused(false)
          resolve({ blob: null, durationMs: elapsedMs, mimeType })
          return
        }

        recorder.onstop = () => {
          if (startedAtRef.current != null) {
            accumulatedRef.current += Date.now() - startedAtRef.current
            startedAtRef.current = null
          }
          const durationMs = accumulatedRef.current
          const type = recorder.mimeType || mimeType || "audio/webm"
          const blob =
            chunksRef.current.length > 0
              ? new Blob(chunksRef.current, { type })
              : null
          stopSpeech()
          stopTicker()
          cleanupStream()
          mediaRecorderRef.current = null
          setElapsedMs(durationMs)
          setRecording(false)
          setPaused(false)
          resolve({ blob, durationMs, mimeType: type })
        }

        try {
          recorder.stop()
        } catch {
          stopSpeech()
          resolve({ blob: null, durationMs: elapsedMs, mimeType })
        }
      },
    )

  return {
    recording,
    paused,
    elapsedMs,
    transcript,
    interim,
    error,
    speechSupported,
    mimeType,
    setTranscript,
    setError,
    getTranscript,
    start,
    pause,
    resume,
    stop,
  }
}
