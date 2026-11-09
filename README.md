# Tribal

Knowledge elicitation for encapsulating tribal knowledge into agent-ready packs.

Interview experts, capture **heuristics**, **procedures**, **gotchas**, and **glossary** terms, then export structured memory for agentic AI (`tribal.agent-pack/v1` JSON or Markdown).

## Run locally

```bash
npm install
npm run dev
```

Open the URL Next prints (default port **3847**).

## How to use

1. Create a knowledge pack (or load the on-call sample).
2. Frame the pack: domain, purpose, audience.
3. Use elicitation prompts to interview an expert out loud.
4. Capture entries in the structured editors.
5. Export JSON for tool/loaders or Markdown for RAG / system prompts.

Data stays in browser `localStorage` — nothing is sent to a server.

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
