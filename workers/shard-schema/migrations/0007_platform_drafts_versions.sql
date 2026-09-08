PRAGMA foreign_keys = ON;

-- D1-Fabric Drafts & Content Version History
-- Purpose: autosaved drafts before publication and immutable content version
-- history after edits.
-- Routing: platform_drafts uses tenant_id + author_id (colocated with author);
-- platform_content_versions uses tenant_id + content_id (colocated with
-- platform_content so edit transactions stay shard-local).

CREATE TABLE IF NOT EXISTS platform_drafts (
  tenant_id      TEXT NOT NULL,
  draft_id       TEXT NOT NULL,
  author_id      TEXT NOT NULL,
  content_type   TEXT NOT NULL,
  title          TEXT,
  body_json      TEXT,
  cover_media_id TEXT,
  assets_json    TEXT,
  auto_save_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status         TEXT NOT NULL DEFAULT 'active',
  PRIMARY KEY (tenant_id, draft_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_drafts_author
  ON platform_drafts(tenant_id, author_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS platform_content_versions (
  tenant_id   TEXT NOT NULL,
  content_id  TEXT NOT NULL,
  version     INTEGER NOT NULL,
  editor_id   TEXT NOT NULL,
  body_json   TEXT,
  title       TEXT,
  summary     TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, content_id, version)
);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('drafts_schema_version', '1', CURRENT_TIMESTAMP);
