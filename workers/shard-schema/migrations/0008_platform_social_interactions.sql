PRAGMA foreign_keys = ON;

-- D1-Fabric Social Interaction Tables
-- Purpose: comment-level reactions (like on comments). Content-level reactions
-- already exist in platform_reactions. This table keeps comment interactions
-- colocated with platform_comments (tenant_id + comment_id routing key) so
-- comment-like counts can be updated in the same shard-local transaction.

CREATE TABLE IF NOT EXISTS platform_comment_reactions (
  tenant_id     TEXT NOT NULL,
  comment_id    TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, comment_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_platform_comment_reactions_user
  ON platform_comment_reactions(tenant_id, user_id, updated_at DESC, comment_id DESC);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('social_interactions_schema_version', '1', CURRENT_TIMESTAMP);
