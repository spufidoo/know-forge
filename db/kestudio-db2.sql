-- KE Studio external store — IBM Db2 LUW dialect
-- Sole source-of-truth schema for database KESTUDIO (local instance mdavage).
-- Apply: db2 connect to KESTUDIO; db2 -tvf db/kestudio-db2.sql
--
-- Contains: bp8k/ts8k (8K pagesize for large CLOBs), workspaces, knowledge_packs,
-- heuristics, procedures, procedure_steps, gotchas, glossary_terms,
-- interview_sessions, deferred FKs (including primary_session NO ACTION),
-- media_assets, analysis_candidates, default workspace seed row.
--
-- IDs: Db2 LUW has no built-in UUID column type. This schema defines a
-- DISTINCT TYPE UUID AS BINARY(16) (native 128-bit UUID storage). Client
-- hyphenated strings convert via CAST(BX'<32-hex>' AS UUID) or
-- VARCHAR_BIT_FORMAT + CAST. GENERATE_UUID_BINARY() (Db2 12.1.3+) can mint
-- new values. Read back with VARCHAR_FORMAT_BINARY(BINARY(col), 'xxxxxxxx-...').
--
-- Audio bytes stay in object storage / public/interviews; DB stores URIs only.
-- Row compression: COMPRESS YES on all tables. No audio BLOB/LOB tables —
-- if one is added later, leave it uncompressed (omit COMPRESS YES).
-- Large CLOBs (transcript, payload_json) use IN ts8k (avoids SQL0286N on 4K).

CREATE BUFFERPOOL bp8k SIZE 250 PAGESIZE 8K;
CREATE LARGE TABLESPACE ts8k
  PAGESIZE 8K
  MANAGED BY AUTOMATIC STORAGE
  BUFFERPOOL bp8k
  AUTORESIZE YES
  INITIALSIZE 32 M
  MAXSIZE NONE;

-- 128-bit UUID storage (BINARY(16)); not a built-in type on Db2 LUW.
CREATE DISTINCT TYPE UUID AS BINARY(16) WITH COMPARISONS;

-- ---------------------------------------------------------------------------
-- Workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE workspaces (
  id            UUID NOT NULL,
  name          VARCHAR(256) NOT NULL,
  created_at    TIMESTAMP NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  CONSTRAINT pk_workspaces PRIMARY KEY (id)
) COMPRESS YES;

-- ---------------------------------------------------------------------------
-- Knowledge packs
-- ---------------------------------------------------------------------------
CREATE TABLE knowledge_packs (
  id                   UUID NOT NULL,
  workspace_id         UUID NOT NULL,
  name                 VARCHAR(256) NOT NULL,
  domain               VARCHAR(512) NOT NULL DEFAULT '',
  purpose              VARCHAR(4000) NOT NULL DEFAULT '',
  audience             VARCHAR(1024) NOT NULL DEFAULT '',
  primary_session_id   UUID,
  created_at           TIMESTAMP NOT NULL,
  updated_at           TIMESTAMP NOT NULL,
  CONSTRAINT pk_knowledge_packs PRIMARY KEY (id),
  CONSTRAINT fk_packs_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) COMPRESS YES;

CREATE INDEX idx_packs_workspace ON knowledge_packs(workspace_id);
CREATE INDEX idx_packs_updated ON knowledge_packs(updated_at);

-- ---------------------------------------------------------------------------
-- Heuristics (character CLOBs: unless_json, tags_json)
-- ---------------------------------------------------------------------------
CREATE TABLE heuristics (
  id                 UUID NOT NULL,
  pack_id            UUID NOT NULL,
  title              VARCHAR(256) NOT NULL,
  when_clause        VARCHAR(4000) NOT NULL DEFAULT '',
  then_clause        VARCHAR(4000) NOT NULL DEFAULT '',
  because            VARCHAR(4000) NOT NULL DEFAULT '',
  unless_json        CLOB(1M) INLINE LENGTH 1024 NOT NULL DEFAULT '[]',
  confidence         VARCHAR(16) NOT NULL DEFAULT 'medium',
  tags_json          CLOB(256K) INLINE LENGTH 512 NOT NULL DEFAULT '[]',
  source             VARCHAR(512) NOT NULL DEFAULT '',
  source_session_id  UUID,
  created_at         TIMESTAMP NOT NULL,
  updated_at         TIMESTAMP NOT NULL,
  CONSTRAINT pk_heuristics PRIMARY KEY (id),
  CONSTRAINT fk_heuristics_pack
    FOREIGN KEY (pack_id) REFERENCES knowledge_packs(id) ON DELETE CASCADE,
  CONSTRAINT chk_heuristics_confidence
    CHECK (confidence IN ('low', 'medium', 'high'))
) COMPRESS YES;

CREATE INDEX idx_heuristics_pack ON heuristics(pack_id);
CREATE INDEX idx_heuristics_src_sess ON heuristics(source_session_id);

-- ---------------------------------------------------------------------------
-- Procedures + steps
-- ---------------------------------------------------------------------------
CREATE TABLE procedures (
  id                 UUID NOT NULL,
  pack_id            UUID NOT NULL,
  title              VARCHAR(256) NOT NULL,
  goal               VARCHAR(4000) NOT NULL DEFAULT '',
  when_to_use        VARCHAR(4000) NOT NULL DEFAULT '',
  when_not_to_use    VARCHAR(4000) NOT NULL DEFAULT '',
  tags_json          CLOB(256K) INLINE LENGTH 512 NOT NULL DEFAULT '[]',
  source             VARCHAR(512) NOT NULL DEFAULT '',
  source_session_id  UUID,
  created_at         TIMESTAMP NOT NULL,
  updated_at         TIMESTAMP NOT NULL,
  CONSTRAINT pk_procedures PRIMARY KEY (id),
  CONSTRAINT fk_procedures_pack
    FOREIGN KEY (pack_id) REFERENCES knowledge_packs(id) ON DELETE CASCADE
) COMPRESS YES;

CREATE INDEX idx_procedures_pack ON procedures(pack_id);

CREATE TABLE procedure_steps (
  id             UUID NOT NULL,
  procedure_id   UUID NOT NULL,
  position       INTEGER NOT NULL,
  action         VARCHAR(4000) NOT NULL DEFAULT '',
  check_text     VARCHAR(4000) NOT NULL DEFAULT '',
  note           VARCHAR(4000) NOT NULL DEFAULT '',
  CONSTRAINT pk_procedure_steps PRIMARY KEY (id),
  CONSTRAINT fk_steps_procedure
    FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE,
  CONSTRAINT chk_steps_position CHECK (position >= 0),
  CONSTRAINT uq_steps_proc_pos UNIQUE (procedure_id, position)
) COMPRESS YES;

CREATE INDEX idx_procedure_steps_proc ON procedure_steps(procedure_id);

-- ---------------------------------------------------------------------------
-- Gotchas
-- ---------------------------------------------------------------------------
CREATE TABLE gotchas (
  id                 UUID NOT NULL,
  pack_id            UUID NOT NULL,
  title              VARCHAR(256) NOT NULL,
  symptom            VARCHAR(4000) NOT NULL DEFAULT '',
  cause              VARCHAR(4000) NOT NULL DEFAULT '',
  fix                VARCHAR(4000) NOT NULL DEFAULT '',
  prevention         VARCHAR(4000) NOT NULL DEFAULT '',
  tags_json          CLOB(256K) INLINE LENGTH 512 NOT NULL DEFAULT '[]',
  source             VARCHAR(512) NOT NULL DEFAULT '',
  source_session_id  UUID,
  created_at         TIMESTAMP NOT NULL,
  updated_at         TIMESTAMP NOT NULL,
  CONSTRAINT pk_gotchas PRIMARY KEY (id),
  CONSTRAINT fk_gotchas_pack
    FOREIGN KEY (pack_id) REFERENCES knowledge_packs(id) ON DELETE CASCADE
) COMPRESS YES;

CREATE INDEX idx_gotchas_pack ON gotchas(pack_id);

-- ---------------------------------------------------------------------------
-- Glossary terms
-- ---------------------------------------------------------------------------
CREATE TABLE glossary_terms (
  id                 UUID NOT NULL,
  pack_id            UUID NOT NULL,
  term               VARCHAR(256) NOT NULL,
  definition         VARCHAR(4000) NOT NULL DEFAULT '',
  aliases_json       CLOB(256K) INLINE LENGTH 512 NOT NULL DEFAULT '[]',
  related_json       CLOB(256K) INLINE LENGTH 512 NOT NULL DEFAULT '[]',
  source             VARCHAR(512) NOT NULL DEFAULT '',
  source_session_id  UUID,
  created_at         TIMESTAMP NOT NULL,
  updated_at         TIMESTAMP NOT NULL,
  CONSTRAINT pk_glossary_terms PRIMARY KEY (id),
  CONSTRAINT fk_terms_pack
    FOREIGN KEY (pack_id) REFERENCES knowledge_packs(id) ON DELETE CASCADE
) COMPRESS YES;

CREATE INDEX idx_terms_pack ON glossary_terms(pack_id);
CREATE UNIQUE INDEX idx_terms_pack_term
  ON glossary_terms(pack_id, term);

-- ---------------------------------------------------------------------------
-- Interview sessions (character CLOB: transcript — compressed)
-- ---------------------------------------------------------------------------
CREATE TABLE interview_sessions (
  id              UUID NOT NULL,
  pack_id         UUID NOT NULL,
  title           VARCHAR(256) NOT NULL DEFAULT '',
  expert_name     VARCHAR(256) NOT NULL DEFAULT '',
  status          VARCHAR(32) NOT NULL DEFAULT 'ready',
  mime_type       VARCHAR(128) NOT NULL DEFAULT '',
  duration_ms     INTEGER NOT NULL DEFAULT 0,
  has_audio       SMALLINT NOT NULL DEFAULT 0,
  audio_uri       VARCHAR(1024),
  transcript_uri  VARCHAR(1024),
  transcript      CLOB(16M) INLINE LENGTH 4096 NOT NULL DEFAULT '',
  created_at      TIMESTAMP NOT NULL,
  updated_at      TIMESTAMP NOT NULL,
  CONSTRAINT pk_interview_sessions PRIMARY KEY (id),
  CONSTRAINT fk_sessions_pack
    FOREIGN KEY (pack_id) REFERENCES knowledge_packs(id) ON DELETE CASCADE,
  CONSTRAINT chk_sessions_status
    CHECK (status IN ('recording', 'ready', 'analyzed')),
  CONSTRAINT chk_sessions_duration CHECK (duration_ms >= 0),
  CONSTRAINT chk_sessions_has_audio CHECK (has_audio IN (0, 1))
) IN ts8k COMPRESS YES;

CREATE INDEX idx_sessions_pack ON interview_sessions(pack_id);
CREATE INDEX idx_sessions_pack_upd ON interview_sessions(pack_id, updated_at);
CREATE INDEX idx_sessions_status ON interview_sessions(status);

-- Deferred FKs that reference interview_sessions
-- NO ACTION (not SET NULL): SET NULL would cycle with
-- interview_sessions.pack_id → knowledge_packs ON DELETE CASCADE (SQL20254N).
ALTER TABLE knowledge_packs
  ADD CONSTRAINT fk_packs_primary_session
  FOREIGN KEY (primary_session_id) REFERENCES interview_sessions(id)
  ON DELETE NO ACTION;

ALTER TABLE heuristics
  ADD CONSTRAINT fk_heuristics_source_session
  FOREIGN KEY (source_session_id) REFERENCES interview_sessions(id)
  ON DELETE SET NULL;

ALTER TABLE procedures
  ADD CONSTRAINT fk_procedures_source_session
  FOREIGN KEY (source_session_id) REFERENCES interview_sessions(id)
  ON DELETE SET NULL;

ALTER TABLE gotchas
  ADD CONSTRAINT fk_gotchas_source_session
  FOREIGN KEY (source_session_id) REFERENCES interview_sessions(id)
  ON DELETE SET NULL;

ALTER TABLE glossary_terms
  ADD CONSTRAINT fk_terms_source_session
  FOREIGN KEY (source_session_id) REFERENCES interview_sessions(id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Media asset pointers (URIs only — no audio BLOB column; compressed)
-- ---------------------------------------------------------------------------
CREATE TABLE media_assets (
  id               UUID NOT NULL,
  session_id       UUID NOT NULL,
  kind             VARCHAR(32) NOT NULL,
  uri              VARCHAR(1024) NOT NULL,
  mime_type        VARCHAR(128) NOT NULL DEFAULT '',
  byte_size        BIGINT,
  checksum_sha256  CHAR(64),
  created_at       TIMESTAMP NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  CONSTRAINT pk_media_assets PRIMARY KEY (id),
  CONSTRAINT fk_media_session
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
  CONSTRAINT chk_media_kind
    CHECK (kind IN ('audio_webm', 'audio_wav', 'transcript', 'analysis_export')),
  CONSTRAINT uq_media_session_kind UNIQUE (session_id, kind)
) COMPRESS YES;

CREATE INDEX idx_media_session ON media_assets(session_id);

-- ---------------------------------------------------------------------------
-- Analysis candidates (character CLOB: payload_json)
-- ---------------------------------------------------------------------------
CREATE TABLE analysis_candidates (
  id                      UUID NOT NULL,
  session_id              UUID NOT NULL,
  kind                    VARCHAR(16) NOT NULL,
  title                   VARCHAR(256) NOT NULL,
  excerpt                 VARCHAR(4000) NOT NULL DEFAULT '',
  confidence              VARCHAR(16) NOT NULL DEFAULT 'medium',
  status                  VARCHAR(16) NOT NULL DEFAULT 'pending',
  payload_json            CLOB(4M) INLINE LENGTH 2048 NOT NULL DEFAULT '{}',
  accepted_heuristic_id   UUID,
  accepted_procedure_id   UUID,
  accepted_gotcha_id      UUID,
  accepted_term_id        UUID,
  created_at              TIMESTAMP NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  CONSTRAINT pk_analysis_candidates PRIMARY KEY (id),
  CONSTRAINT fk_candidates_session
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_cand_heuristic
    FOREIGN KEY (accepted_heuristic_id) REFERENCES heuristics(id) ON DELETE SET NULL,
  CONSTRAINT fk_cand_procedure
    FOREIGN KEY (accepted_procedure_id) REFERENCES procedures(id) ON DELETE SET NULL,
  CONSTRAINT fk_cand_gotcha
    FOREIGN KEY (accepted_gotcha_id) REFERENCES gotchas(id) ON DELETE SET NULL,
  CONSTRAINT fk_cand_term
    FOREIGN KEY (accepted_term_id) REFERENCES glossary_terms(id) ON DELETE SET NULL,
  CONSTRAINT chk_cand_kind
    CHECK (kind IN ('heuristic', 'procedure', 'gotcha', 'term')),
  CONSTRAINT chk_cand_confidence
    CHECK (confidence IN ('low', 'medium', 'high')),
  CONSTRAINT chk_cand_status
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT chk_cand_accepted_kind CHECK (
    status <> 'accepted'
    OR (kind = 'heuristic' AND accepted_heuristic_id IS NOT NULL)
    OR (kind = 'procedure' AND accepted_procedure_id IS NOT NULL)
    OR (kind = 'gotcha' AND accepted_gotcha_id IS NOT NULL)
    OR (kind = 'term' AND accepted_term_id IS NOT NULL)
  )
) IN ts8k COMPRESS YES;

CREATE INDEX idx_candidates_session ON analysis_candidates(session_id);
CREATE INDEX idx_candidates_sess_st ON analysis_candidates(session_id, status);

-- Default single-user workspace (hyphenated form: 00000000-0000-4000-8000-000000000001)
INSERT INTO workspaces (id, name)
VALUES (CAST(BX'00000000000040008000000000000001' AS UUID), 'KE Studio default');
