# Knowledge Elicitation Studio

**KE Studio** — knowledge elicitation for encapsulating tribal knowledge into agent-ready packs.

Interview experts, capture **heuristics**, **procedures**, **gotchas**, and **glossary** terms, then export structured memory for agentic AI (`tribal.agent-pack/v1` JSON or Markdown).

## Android app (PWA)

Knowledge Elicitation Studio installs as a standalone Android app from Chrome:

1. Open the site in **Chrome on Android**.
2. Tap the browser menu → **Install app** / **Add to Home screen** (or use the in-app install banner).
3. Launch **KE Studio** from your home screen.
4. Open a pack → **Record interview**.
5. Record with consent, review the transcript, **Analyze**, accept candidates, and add them to the pack.

Recordings and transcripts stay in on-device storage (IndexedDB). Live speech-to-text uses the browser Speech Recognition API where available (Chrome). You can also paste a transcript. Export an analysis brief Markdown file when you want deeper review outside the device.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Next prints (default port **3847**).

## How to use

1. Create a knowledge pack (or load the on-call sample).
2. Frame the pack: domain, purpose, audience.
3. Use elicitation prompts to interview an expert out loud — or record the conversation in interview mode.
4. Capture entries in the structured editors (or accept analyzed candidates from a recording).
5. Export JSON for tool/loaders or Markdown for RAG / system prompts.

Data stays in browser storage — nothing is sent to a server.

## Pack shape

| Kind | Structure |
| --- | --- |
| Heuristic | when → then → because → unless + confidence |
| Procedure | goal, use/avoid conditions, ordered steps with checks |
| Gotcha | symptom → cause → fix → prevention |
| Glossary | term, definition, aliases, related |

## Scripts

- `npm run dev` — development server on port 3847
- `npm run build` — production build
- `npm run start` — serve production build on port 3847
- `npm run lint` — ESLint
=======
# know-forge
Knowledge Elicitation Studio
>>>>>>> fd2e4f93a91765dd12c05a75223c28093a13579f
