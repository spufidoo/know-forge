#!/usr/bin/env python3
"""Transcribe an audio file with local openai-whisper (no OpenAI API)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio", type=Path)
    parser.add_argument(
        "--model",
        default="base",
        help="Whisper model size (tiny, base, small, ...). Default: base",
    )
    parser.add_argument("--language", default="en")
    args = parser.parse_args()

    if not args.audio.is_file():
        print(f"Audio not found: {args.audio}", file=sys.stderr)
        return 2

    try:
        import whisper
    except ImportError:
        print(
            "openai-whisper is not installed. Run: python -m pip install openai-whisper",
            file=sys.stderr,
        )
        return 3

    model = whisper.load_model(args.model)
    result = model.transcribe(
        str(args.audio),
        language=args.language or None,
        fp16=False,
    )
    text = (result.get("text") or "").strip()
    if not text:
        print("Transcription returned no text.", file=sys.stderr)
        return 4

    sys.stdout.write(text)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
