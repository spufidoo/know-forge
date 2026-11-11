export type SqlRow = Record<string, unknown>

export type SqlDriver = {
  readonly dialect: "sqlite" | "postgres" | "mysql" | "mssql" | "db2"
  ensureSchema(): Promise<void>
  /** Run a query that returns rows. */
  query<T extends SqlRow = SqlRow>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>
  /** Run a statement with no result set. */
  execute(sql: string, params?: unknown[]): Promise<void>
  close?(): Promise<void>
}

export function schemaStatements(dialect: SqlDriver["dialect"]): string[] {
  if (dialect === "sqlite") {
    return [
      `CREATE TABLE IF NOT EXISTS kf_knowledge_store (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS kf_interview_sessions (
        id TEXT PRIMARY KEY,
        pack_id TEXT NOT NULL,
        meta_json TEXT NOT NULL,
        audio_base64 TEXT,
        audio_mime TEXT,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_kf_sessions_pack
        ON kf_interview_sessions(pack_id)`,
    ]
  }

  if (dialect === "postgres") {
    return [
      `CREATE TABLE IF NOT EXISTS kf_knowledge_store (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS kf_interview_sessions (
        id VARCHAR(36) PRIMARY KEY,
        pack_id VARCHAR(36) NOT NULL,
        meta_json TEXT NOT NULL,
        audio_base64 TEXT,
        audio_mime VARCHAR(128),
        updated_at TIMESTAMPTZ NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_kf_sessions_pack
        ON kf_interview_sessions(pack_id)`,
    ]
  }

  if (dialect === "mysql") {
    return [
      `CREATE TABLE IF NOT EXISTS kf_knowledge_store (
        id INT PRIMARY KEY,
        payload LONGTEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS kf_interview_sessions (
        id VARCHAR(36) PRIMARY KEY,
        pack_id VARCHAR(36) NOT NULL,
        meta_json LONGTEXT NOT NULL,
        audio_base64 LONGTEXT,
        audio_mime VARCHAR(128),
        updated_at VARCHAR(40) NOT NULL,
        INDEX idx_kf_sessions_pack (pack_id)
      )`,
    ]
  }

  if (dialect === "mssql") {
    return [
      `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'kf_knowledge_store')
       CREATE TABLE kf_knowledge_store (
         id INT NOT NULL PRIMARY KEY,
         payload NVARCHAR(MAX) NOT NULL
       )`,
      `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'kf_interview_sessions')
       CREATE TABLE kf_interview_sessions (
         id NVARCHAR(36) NOT NULL PRIMARY KEY,
         pack_id NVARCHAR(36) NOT NULL,
         meta_json NVARCHAR(MAX) NOT NULL,
         audio_base64 NVARCHAR(MAX) NULL,
         audio_mime NVARCHAR(128) NULL,
         updated_at NVARCHAR(40) NOT NULL
       )`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_kf_sessions_pack')
       CREATE INDEX idx_kf_sessions_pack ON kf_interview_sessions(pack_id)`,
    ]
  }

  // db2 / db2-zos
  return [
    `CREATE TABLE kf_knowledge_store (
      id INTEGER NOT NULL PRIMARY KEY,
      payload CLOB(16M) INLINE LENGTH 4096 NOT NULL
    )`,
    `CREATE TABLE kf_interview_sessions (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      pack_id VARCHAR(36) NOT NULL,
      meta_json CLOB(16M) INLINE LENGTH 4096 NOT NULL,
      audio_base64 CLOB(128M),
      audio_mime VARCHAR(128),
      updated_at VARCHAR(40) NOT NULL
    )`,
    `CREATE INDEX idx_kf_sessions_pack ON kf_interview_sessions(pack_id)`,
  ]
}
