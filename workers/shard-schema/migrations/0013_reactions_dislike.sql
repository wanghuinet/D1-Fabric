PRAGMA foreign_keys = ON;

-- D1-Fabric Schema V2.1: expand platform_reactions.reaction_type to support 'dislike'.
-- This is an EXPAND (adds an allowed enum value). SQLite cannot ALTER a CHECK
-- constraint in place, so we rebuild the table preserving all existing rows.
-- No data is lost; the new CHECK allows 'like','bookmark','dislike'.

CREATE TABLE IF NOT EXISTS platform_reactions_new (
  tenant_id     TEXT NOT NULL,
  content_id    TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like','bookmark','dislike')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, content_id, user_id, reaction_type)
);

INSERT INTO platform_reactions_new (tenant_id, content_id, user_id, reaction_type, status, created_at, updated_at)
SELECT tenant_id, content_id, user_id, reaction_type, status, created_at, updated_at FROM platform_reactions;

DROP TABLE platform_reactions;
ALTER TABLE platform_reactions_new RENAME TO platform_reactions;

CREATE INDEX IF NOT EXISTS idx_platform_reactions_user
  ON platform_reactions(tenant_id, user_id, reaction_type, updated_at DESC, content_id DESC);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('social_reactions_schema_version', '2', CURRENT_TIMESTAMP);
