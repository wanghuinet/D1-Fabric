PRAGMA foreign_keys = ON;

-- D1-Fabric Search Tables
-- Purpose: full-text search index over content and user search history.
-- The FTS5 virtual table is Tier B (durable asynchronous): populated via
-- outbox, not part of the publication ACID boundary.
-- Hot-path rule: feed queries must not load large body payloads; the FTS
-- index stores a searchable text copy but feed/card reads still come from
-- platform_content (projection without body_json).

CREATE VIRTUAL TABLE IF NOT EXISTS platform_search_index USING fts5(
  content_id,
  title,
  body_text,
  author_name,
  tags,
  tokenize = 'unicode61'
);

CREATE TABLE IF NOT EXISTS platform_search_history (
  tenant_id  TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  query      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, user_id, query, created_at)
);

CREATE INDEX IF NOT EXISTS idx_platform_search_history_user
  ON platform_search_history(tenant_id, user_id, created_at DESC);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('search_schema_version', '1', CURRENT_TIMESTAMP);
