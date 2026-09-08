PRAGMA foreign_keys = ON;

-- D1-Fabric Content Platform V2 Expansion
-- Purpose: backward-compatible field additions to existing V1 tables.
-- This migration is ADD/EXPAND only: no primary key, index, or CHECK constraint
-- of existing tables is modified. All new columns are nullable or carry defaults.
-- Cross-domain foreign keys are intentionally omitted (domains may be routed to
-- different physical D1 shards).

-- ============================================================================
-- platform_users: add identity credentials (hashed) and profile counters
-- ============================================================================

ALTER TABLE platform_users ADD COLUMN phone_hash TEXT;
ALTER TABLE platform_users ADD COLUMN email_hash TEXT;
ALTER TABLE platform_users ADD COLUMN password_hash TEXT;
ALTER TABLE platform_users ADD COLUMN gender TEXT;
ALTER TABLE platform_users ADD COLUMN birthday TEXT;
ALTER TABLE platform_users ADD COLUMN city_id TEXT;
ALTER TABLE platform_users ADD COLUMN is_creator INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_users ADD COLUMN fans_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_users ADD COLUMN following_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_users ADD COLUMN feed_version INTEGER NOT NULL DEFAULT 1;

-- Login lookup indexes. Hashed values; plaintext credentials are never stored.
CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_users_phone
  ON platform_users(tenant_id, phone_hash) WHERE phone_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_users_email
  ON platform_users(tenant_id, email_hash) WHERE email_hash IS NOT NULL;

-- ============================================================================
-- platform_authors: add creator profile and materialized counters
-- ============================================================================

ALTER TABLE platform_authors ADD COLUMN fans_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_authors ADD COLUMN content_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_authors ADD COLUMN description TEXT;
ALTER TABLE platform_authors ADD COLUMN cover_media_id TEXT;
ALTER TABLE platform_authors ADD COLUMN income_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_authors ADD COLUMN category TEXT;

-- ============================================================================
-- platform_content: add body storage, media metadata, provenance, counters
-- ============================================================================

ALTER TABLE platform_content ADD COLUMN body_json TEXT;
ALTER TABLE platform_content ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_content ADD COLUMN video_duration_ms INTEGER;
ALTER TABLE platform_content ADD COLUMN video_bitrate INTEGER;
ALTER TABLE platform_content ADD COLUMN video_resolution TEXT;
ALTER TABLE platform_content ADD COLUMN video_url TEXT;
ALTER TABLE platform_content ADD COLUMN cover_url TEXT;
ALTER TABLE platform_content ADD COLUMN is_original INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_content ADD COLUMN is_ad INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_content ADD COLUMN source_name TEXT;
ALTER TABLE platform_content ADD COLUMN source_url TEXT;
ALTER TABLE platform_content ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_content ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_content ADD COLUMN share_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_content ADD COLUMN tags_json TEXT;

-- Feed / author-listing / category access paths. body_json is intentionally
-- NOT included in any feed index (Hot-path rule: feed queries must not load
-- large body payloads).
CREATE INDEX IF NOT EXISTS idx_platform_content_author
  ON platform_content(tenant_id, author_id, publish_at DESC, content_id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_content_feed
  ON platform_content(tenant_id, status, visibility, publish_at DESC, content_id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_content_category
  ON platform_content(tenant_id, category_id, publish_at DESC, content_id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_content_ad
  ON platform_content(tenant_id, is_ad, status);

-- ============================================================================
-- platform_media: add R2 object reference and upload lifecycle
-- ============================================================================

ALTER TABLE platform_media ADD COLUMN r2_key TEXT;
ALTER TABLE platform_media ADD COLUMN cdn_url TEXT;
ALTER TABLE platform_media ADD COLUMN transcript TEXT;
ALTER TABLE platform_media ADD COLUMN cover_media_id TEXT;
ALTER TABLE platform_media ADD COLUMN upload_status TEXT NOT NULL DEFAULT 'pending';

-- ============================================================================
-- platform_comments: add body text, counters, nested-reply root
-- ============================================================================

ALTER TABLE platform_comments ADD COLUMN body_text TEXT;
ALTER TABLE platform_comments ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_comments ADD COLUMN reply_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_comments ADD COLUMN root_comment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_platform_comments_content
  ON platform_comments(tenant_id, content_id, created_at DESC, comment_id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_comments_parent
  ON platform_comments(tenant_id, parent_comment_id, created_at ASC, comment_id ASC);
CREATE INDEX IF NOT EXISTS idx_platform_comments_root
  ON platform_comments(tenant_id, root_comment_id, created_at ASC, comment_id ASC);

-- ============================================================================
-- platform_reactions: add user-centric listing index
-- (reaction_type CHECK is NOT modified; dislike support is provided by the
-- separate platform_comment_reactions table in a later migration to avoid
-- rebuilding this table.)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_platform_reactions_user
  ON platform_reactions(tenant_id, user_id, reaction_type, updated_at DESC, content_id DESC);

-- ============================================================================
-- platform_follows: add followee-centric listing index
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_platform_follows_followee
  ON platform_follows(tenant_id, followee_id, created_at DESC, follower_id DESC);

-- Schema version bump. V2 = content platform expansion (additive).
INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('content_platform_schema_version', '2', CURRENT_TIMESTAMP);
