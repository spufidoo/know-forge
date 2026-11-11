import { NextResponse } from "next/server"
import {
  getServerSqlBackend,
  isServerSqlBackendId,
} from "@/lib/data-store/server"
import {
  sessionToWire,
  wireToSession,
  type InterviewWire,
} from "@/lib/data-store/shared"
import type { KnowledgeStore } from "@/lib/types"
import type { InterviewSessionRecord } from "@/lib/interview-types"

export const runtime = "nodejs"

type Body = {
  backend?: string
  action?: string
  store?: KnowledgeStore
  packId?: string
  sessionId?: string
  session?: InterviewWire
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    )
  }

  const { backend, action } = body
  if (!backend || !isServerSqlBackendId(backend)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Backend "${backend}" is not a server SQL backend.`,
      },
      { status: 400 },
    )
  }
  if (!action) {
    return NextResponse.json(
      { ok: false, error: "Missing action" },
      { status: 400 },
    )
  }

  try {
    const store = await getServerSqlBackend(backend)

    switch (action) {
      case "loadStore": {
        const data = await store.loadStore()
        return NextResponse.json({ ok: true, data })
      }
      case "saveStore": {
        if (!body.store) {
          return NextResponse.json(
            { ok: false, error: "Missing store" },
            { status: 400 },
          )
        }
        const data = await store.saveStore(body.store)
        return NextResponse.json({ ok: true, data })
      }
      case "listInterviewSessions": {
        if (!body.packId) {
          return NextResponse.json(
            { ok: false, error: "Missing packId" },
            { status: 400 },
          )
        }
        const sessions = await store.listInterviewSessions(body.packId)
        const data = await Promise.all(
          sessions.map(async (meta) => {
            const full = await store.getInterviewSession(meta.id)
            return full ? sessionToWire(full) : ({ ...meta } as InterviewWire)
          }),
        )
        return NextResponse.json({ ok: true, data })
      }
      case "listAllInterviewSessions": {
        const sessions = await store.listAllInterviewSessions()
        const data = await Promise.all(sessions.map((s) => sessionToWire(s)))
        return NextResponse.json({ ok: true, data })
      }
      case "getInterviewSession": {
        if (!body.sessionId) {
          return NextResponse.json(
            { ok: false, error: "Missing sessionId" },
            { status: 400 },
          )
        }
        const row = await store.getInterviewSession(body.sessionId)
        const data = row ? await sessionToWire(row) : null
        return NextResponse.json({ ok: true, data })
      }
      case "saveInterviewSession": {
        if (!body.session) {
          return NextResponse.json(
            { ok: false, error: "Missing session" },
            { status: 400 },
          )
        }
        const record: InterviewSessionRecord = wireToSession(body.session)
        await store.saveInterviewSession(record)
        return NextResponse.json({ ok: true, data: null })
      }
      case "deleteInterviewSession": {
        if (!body.sessionId) {
          return NextResponse.json(
            { ok: false, error: "Missing sessionId" },
            { status: 400 },
          )
        }
        await store.deleteInterviewSession(body.sessionId)
        return NextResponse.json({ ok: true, data: null })
      }
      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "data-store error",
      },
      { status: 500 },
    )
  }
}
