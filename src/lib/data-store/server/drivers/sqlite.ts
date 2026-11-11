import fs from "node:fs"
import path from "node:path"
import { resolveSqlitePath } from "@/lib/data-store/server/connection-env"
import type { SqlDriver, SqlRow } from "@/lib/data-store/server/sql-driver"

type BetterSqlite = {
  Database: new (
    filename: string,
    options?: { readonly?: boolean },
  ) => {
    prepare: (sql: string) => {
      all: (...params: unknown[]) => SqlRow[]
      run: (...params: unknown[]) => unknown
    }
    exec: (sql: string) => unknown
    close: () => void
  }
}

type FileDb = {
  knowledge: { payload: string } | null
  sessions: Array<{
    id: string
    pack_id: string
    meta_json: string
    audio_base64: string | null
    audio_mime: string | null
    updated_at: string
  }>
}

let cached: SqlDriver | null = null

function defaultSqlitePath() {
  return resolveSqlitePath()
}

function fileFallbackPath(sqlitePath: string) {
  return sqlitePath.replace(/\.sqlite$/i, "") + ".json"
}

function createFileDriver(file: string): SqlDriver {
  const jsonPath = fileFallbackPath(file)
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true })

  const read = (): FileDb => {
    if (!fs.existsSync(jsonPath)) return { knowledge: null, sessions: [] }
    try {
      return JSON.parse(fs.readFileSync(jsonPath, "utf8")) as FileDb
    } catch {
      return { knowledge: null, sessions: [] }
    }
  }
  const write = (db: FileDb) => {
    fs.writeFileSync(jsonPath, JSON.stringify(db, null, 2), "utf8")
  }

  return {
    dialect: "sqlite",
    async ensureSchema() {},
    async query<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []) {
      const db = read()
      const s = sql.replace(/\s+/g, " ").trim().toLowerCase()
      if (s.startsWith("select payload from kf_knowledge_store")) {
        return (db.knowledge ? [db.knowledge] : []) as T[]
      }
      if (s.startsWith("select id from kf_knowledge_store")) {
        return (db.knowledge ? [{ id: 1 }] : []) as T[]
      }
      if (s.includes("from kf_interview_sessions where pack_id")) {
        return db.sessions.filter((r) => r.pack_id === params[0]) as T[]
      }
      if (s.includes("from kf_interview_sessions where id")) {
        return db.sessions.filter((r) => r.id === params[0]) as T[]
      }
      if (s.startsWith("select") && s.includes("from kf_interview_sessions")) {
        return db.sessions as T[]
      }
      return [] as T[]
    },
    async execute(sql: string, params: unknown[] = []) {
      const s = sql.replace(/\s+/g, " ").trim().toLowerCase()
      if (s.startsWith("create")) return
      const db = read()
      if (s.startsWith("insert into kf_knowledge_store")) {
        db.knowledge = { payload: String(params[1]) }
        write(db)
        return
      }
      if (s.startsWith("update kf_knowledge_store")) {
        db.knowledge = { payload: String(params[0]) }
        write(db)
        return
      }
      if (s.startsWith("insert into kf_interview_sessions")) {
        db.sessions = db.sessions.filter((r) => r.id !== params[0])
        db.sessions.push({
          id: String(params[0]),
          pack_id: String(params[1]),
          meta_json: String(params[2]),
          audio_base64: (params[3] as string | null) ?? null,
          audio_mime: (params[4] as string | null) ?? null,
          updated_at: String(params[5]),
        })
        write(db)
        return
      }
      if (s.startsWith("update kf_interview_sessions")) {
        const id = String(params[5])
        db.sessions = db.sessions.map((r) =>
          r.id === id
            ? {
                id,
                pack_id: String(params[0]),
                meta_json: String(params[1]),
                audio_base64: (params[2] as string | null) ?? null,
                audio_mime: (params[3] as string | null) ?? null,
                updated_at: String(params[4]),
              }
            : r,
        )
        write(db)
        return
      }
      if (s.startsWith("delete from kf_interview_sessions")) {
        db.sessions = db.sessions.filter((r) => r.id !== params[0])
        write(db)
      }
    },
  }
}

export async function createSqliteDriver(): Promise<SqlDriver> {
  if (cached) return cached

  const file = defaultSqlitePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })

  try {
    const mod = (await import("better-sqlite3")) as unknown as
      | BetterSqlite
      | { default: BetterSqlite["Database"] }
    const Database =
      "Database" in mod && typeof mod.Database === "function"
        ? mod.Database
        : (mod as { default: BetterSqlite["Database"] }).default

    const db = new Database(file)
    cached = {
      dialect: "sqlite",
      async ensureSchema() {},
      async query<T extends SqlRow = SqlRow>(
        sql: string,
        params: unknown[] = [],
      ) {
        return db.prepare(sql).all(...params) as T[]
      },
      async execute(sql: string, params: unknown[] = []) {
        if (params.length === 0 && /^(CREATE|IF\b)/i.test(sql.trim())) {
          db.exec(sql)
          return
        }
        db.prepare(sql).run(...params)
      },
      async close() {
        db.close()
        cached = null
      },
    }
    return cached
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(
      `[data-store/sqlite] better-sqlite3 unavailable (${msg}); using JSON file fallback at ${fileFallbackPath(file)}`,
    )
    cached = createFileDriver(file)
    return cached
  }
}
