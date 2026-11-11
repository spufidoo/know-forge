import type { KnowledgeDataBackend, SaveStoreResult } from "@/lib/data-store/types"
import type { StorageBackendId } from "@/lib/data-store/types"
import type { InterviewSessionRecord } from "@/lib/interview-types"
import type { KnowledgeStore } from "@/lib/types"
import {
  emptyStore,
  parseKnowledgeStore,
  sessionToWire,
  toSessionMeta,
  wireToSession,
  type InterviewWire,
} from "@/lib/data-store/shared"
import type { SqlDriver } from "@/lib/data-store/server/sql-driver"
import { schemaStatements } from "@/lib/data-store/server/sql-driver"

function q(dialect: SqlDriver["dialect"], sql: string): string {
  if (dialect === "postgres") {
    let i = 0
    return sql.replace(/\?/g, () => `$${++i}`)
  }
  if (dialect === "mssql") {
    let i = 0
    return sql.replace(/\?/g, () => `@p${++i}`)
  }
  return sql
}

async function ensure(driver: SqlDriver) {
  for (const stmt of schemaStatements(driver.dialect)) {
    try {
      await driver.execute(stmt)
    } catch (err) {
      // Db2: table may already exist (SQL0601N) — ignore duplicate.
      const msg = err instanceof Error ? err.message : String(err)
      if (/already exists|SQL0601N|42P07|1050/i.test(msg)) continue
      throw err
    }
  }
}

function rowToWire(row: Record<string, unknown>): InterviewWire {
  const meta = JSON.parse(String(row.meta_json ?? "{}")) as InterviewWire
  return {
    ...meta,
    audioBase64: (row.audio_base64 as string | null) ?? null,
    audioMimeType: (row.audio_mime as string | null) ?? null,
  }
}

export function createSqlJsonBackend(
  id: StorageBackendId,
  label: string,
  driver: SqlDriver,
): KnowledgeDataBackend {
  let ready: Promise<void> | null = null
  const readyOnce = () => {
    if (!ready) ready = ensure(driver)
    return ready
  }

  return {
    id,
    label,
    supportsSyncPacks: false,

    async loadStore() {
      await readyOnce()
      const rows = await driver.query<{ payload: string }>(
        q(driver.dialect, "SELECT payload FROM kf_knowledge_store WHERE id = ?"),
        [1],
      )
      if (!rows[0]?.payload) return emptyStore()
      try {
        return parseKnowledgeStore(JSON.parse(rows[0].payload))
      } catch {
        return emptyStore()
      }
    },

    async saveStore(store: KnowledgeStore): Promise<SaveStoreResult> {
      try {
        await readyOnce()
        const payload = JSON.stringify(store)
        const existing = await driver.query(
          q(driver.dialect, "SELECT id FROM kf_knowledge_store WHERE id = ?"),
          [1],
        )
        if (existing.length) {
          await driver.execute(
            q(
              driver.dialect,
              "UPDATE kf_knowledge_store SET payload = ? WHERE id = ?",
            ),
            [payload, 1],
          )
        } else {
          await driver.execute(
            q(
              driver.dialect,
              "INSERT INTO kf_knowledge_store (id, payload) VALUES (?, ?)",
            ),
            [1, payload],
          )
        }
        return { ok: true }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "SQL saveStore failed",
        }
      }
    },

    async listInterviewSessions(packId) {
      await readyOnce()
      const rows = await driver.query(
        q(
          driver.dialect,
          "SELECT meta_json, audio_base64, audio_mime FROM kf_interview_sessions WHERE pack_id = ?",
        ),
        [packId],
      )
      return rows
        .map(rowToWire)
        .map((w) => toSessionMeta(wireToSession(w)))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },

    async listAllInterviewSessions() {
      await readyOnce()
      const rows = await driver.query(
        "SELECT meta_json, audio_base64, audio_mime FROM kf_interview_sessions",
      )
      return rows
        .map(rowToWire)
        .map(wireToSession)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },

    async getInterviewSession(id) {
      await readyOnce()
      const rows = await driver.query(
        q(
          driver.dialect,
          "SELECT meta_json, audio_base64, audio_mime FROM kf_interview_sessions WHERE id = ?",
        ),
        [id],
      )
      if (!rows[0]) return null
      return wireToSession(rowToWire(rows[0]))
    },

    async saveInterviewSession(session: InterviewSessionRecord) {
      await readyOnce()
      const wire = await sessionToWire(session)
      const { audioBase64, audioMimeType, ...meta } = wire
      const metaJson = JSON.stringify(meta)
      const existing = await driver.query(
        q(driver.dialect, "SELECT id FROM kf_interview_sessions WHERE id = ?"),
        [session.id],
      )
      if (existing.length) {
        await driver.execute(
          q(
            driver.dialect,
            `UPDATE kf_interview_sessions
             SET pack_id = ?, meta_json = ?, audio_base64 = ?, audio_mime = ?, updated_at = ?
             WHERE id = ?`,
          ),
          [
            session.packId,
            metaJson,
            audioBase64,
            audioMimeType,
            session.updatedAt,
            session.id,
          ],
        )
      } else {
        await driver.execute(
          q(
            driver.dialect,
            `INSERT INTO kf_interview_sessions
             (id, pack_id, meta_json, audio_base64, audio_mime, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ),
          [
            session.id,
            session.packId,
            metaJson,
            audioBase64,
            audioMimeType,
            session.updatedAt,
          ],
        )
      }
    },

    async deleteInterviewSession(id) {
      await readyOnce()
      await driver.execute(
        q(driver.dialect, "DELETE FROM kf_interview_sessions WHERE id = ?"),
        [id],
      )
    },
  }
}
