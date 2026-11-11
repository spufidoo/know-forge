# Knowledge data-store

Pluggable backends behind `KnowledgeDataBackend`. Select with
`NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND` (see `registry.ts`).

## Browser backends (no connection string)

| Id | Storage |
|----|---------|
| `browser-local` | Packs: `localStorage` key `tribal.knowledge-store.v1`. Interviews: IndexedDB `tribal.interviews.v1`. **Default.** |
| `localStorage` | Packs + interviews in `localStorage` (audio as base64). |
| `indexeddb` | Packs + interviews in IndexedDB `tribal.knowledge.indexeddb.v1`. |

## SQL backends (server-side `process.env`)

Client stubs in `backends/http-remote.ts` call `POST /api/data-store`.
Drivers under `server/drivers/` resolve connection strings via
`server/connection-env.ts` (first non-empty name wins).

| Backend id | Preferred connection env | Fallbacks |
|------------|--------------------------|-----------|
| `postgresql` | `POSTGRES_URL` | `POSTGRESQL_URL`, `POSTGRES_CONNECTION_STRING`, `KNOWLEDGE_DATABASE_URL`, `DATABASE_URL`, or discrete `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` |
| `mysql` | `MYSQL_URL` | `MYSQL_CONNECTION_STRING`, `KNOWLEDGE_MYSQL_URL`, `DATABASE_URL` if `mysql://…`, or `MYSQL_HOST` + `MYSQL_DATABASE` (+ user/password/port) |
| `sqlserver` | `MSSQL_CONNECTION_STRING` | `SQLSERVER_URL`, `SQLSERVER_CONNECTION_STRING`, `KNOWLEDGE_MSSQL_URL`, `DATABASE_URL` if `sqlserver://` / `mssql://`, or `MSSQL_SERVER` + `MSSQL_DATABASE` |
| `db2` | `DB2_CONNECTION_STRING` | `DB2_URL`, `KNOWLEDGE_DB2_CONNECTION_STRING`, or `DB2_UID`/`DB2_PWD` (+ optional `DB2_DATABASE` default `KESTUDIO`, `DB2_HOST`, `DB2_PORT`) |
| `db2-zos` | `DB2ZOS_CONNECTION_STRING` | `DB2_ZOS_CONNECTION_STRING`, `DB2ZOS_URL`, or `DB2ZOS_HOST`/`DATABASE`/`UID`/`PWD` |
| `sqlite` | `SQLITE_URL` or `SQLITE_PATH` | `SQLITE_CONNECTION_STRING`, `KNOWLEDGE_SQLITE_PATH`, `DATABASE_URL` if `file:…` / `*.sqlite`, else `data/ke-studio.sqlite` |

Examples:

```bash
NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND=postgresql
POSTGRES_URL=postgres://user:pass@localhost:5432/kestudio

NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND=mysql
MYSQL_URL=mysql://user:pass@127.0.0.1:3306/kestudio

NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND=sqlserver
MSSQL_CONNECTION_STRING="Server=localhost,1433;Database=kestudio;User Id=sa;Password=…;Encrypt=true;TrustServerCertificate=true"

NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND=db2
DB2_CONNECTION_STRING="DATABASE=KESTUDIO;HOSTNAME=127.0.0.1;PORT=25000;PROTOCOL=TCPIP;UID=…;PWD=…;"

NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND=db2-zos
DB2ZOS_CONNECTION_STRING="DATABASE=…;HOSTNAME=…;PORT=446;PROTOCOL=TCPIP;UID=…;PWD=…;"

NEXT_PUBLIC_KNOWLEDGE_STORAGE_BACKEND=sqlite
SQLITE_PATH=./data/ke-studio.sqlite
# or: SQLITE_URL=file:./data/ke-studio.sqlite
```

Packages: `pg`, `mysql2`, `mssql`, `better-sqlite3` (JSON file fallback if native build fails). Db2 needs optional `ibm_db` + IBM CLI driver.
