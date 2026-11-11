"use client"

import { useCallback, useEffect, useState } from "react"
import {
  deleteInterviewSession,
  getInterviewSession,
  listInterviewSessions,
  saveInterviewSession,
} from "@/lib/data-store"
import type {
  InterviewSessionMeta,
  InterviewSessionRecord,
} from "@/lib/interview-types"

export function useInterviewSessions(packId: string) {
  const [sessions, setSessions] = useState<InterviewSessionMeta[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const rows = await listInterviewSessions(packId)
    setSessions(rows)
    setReady(true)
  }, [packId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await listInterviewSessions(packId)
      if (!cancelled) {
        setSessions(rows)
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [packId])

  const save = useCallback(
    async (session: InterviewSessionRecord) => {
      const stamped: InterviewSessionRecord = {
        ...session,
        updatedAt: new Date().toISOString(),
      }
      await saveInterviewSession(stamped)
      await refresh()
      return stamped
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteInterviewSession(id)
      await refresh()
    },
    [refresh],
  )

  const load = useCallback(async (id: string) => getInterviewSession(id), [])

  return {
    sessions,
    ready,
    refresh,
    save,
    remove,
    load,
  }
}
