PRAGMA foreign_keys = ON;

-- D1-Fabric Content Platform V1
-- Purpose: normalized business facts for article/video/image/dynamic content,
-- social relationships, interactions, comments, events and materialized ranking.
-- This migration is additive. It does not alter the generic fabric_records contract.
-- Cross-domain foreign keys are intentionally omitted because domains may be
-- physically routed to different D1 shards.

CREATE TABLE IF NOT EXISTS platform_users (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  display_name TEXT,
  avatar_media_id TEXT,
  bio TEXT,
  locale TEXT,
  region TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_users_status
  ON platform_users(tenant_id, status, updated_at, user_id);

CREATE TABLE IF NOT EXISTS platform_authors (
  tenant_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  creator_type TEXT NOT NULL DEFAULT 'human' CHECK (creator_type IN ('human','organization','agent','hybrid')),
  author_name TEXT,
  avatar_media_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'none' CHECK (verification_status IN ('none','pending','verified','revoked')),
  quality_score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, author_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_authors_user
  ON platform_authors(tenant_id, user_id);

CREATE TABLE IF NOT EXISTS platform_content (
  tenant_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article','video','image','dynamic','audio','qa','live','ai')),
  title TEXT,
  summary TEXT,
  cover_media_id TEXT,
  body_ref TEXT,
  language TEXT,
  region TEXT,
  category_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','published','hidden','blocked','deleted')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers','private')),
  publish_at TEXT,
  quality_score REAL NOT NULL DEFAULT 0,
  risk_level INTEGER NOT NULL DEFAULT 0 CHECK (risk_level >= 0),
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  content_version INTEGER NOT NULL DEFAULT 1 CHECK (content_version >= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_content_author
  ON platform_content(tenant_id, author_id, publish_at DESC, content_id DESC);

CREATE INDEX IF NOT EXISTS idx_platform_content_feed
  ON platform_content(tenant_id, status, visibility, publish_at DESC, content_id DESC);

CREATE INDEX IF NOT EXISTS idx_platform_content_category
  ON platform_content(tenant_id, category_id, publish_at DESC, content_id DESC);

CREATE TABLE IF NOT EXISTS platform_content_stats (
  tenant_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  comment_count INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  share_count INTEGER NOT NULL DEFAULT 0 CHECK (share_count >= 0),
  bookmark_count INTEGER NOT NULL DEFAULT 0 CHECK (bookmark_count >= 0),
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  impression_count INTEGER NOT NULL DEFAULT 0 CHECK (impression_count >= 0),
  hot_score REAL NOT NULL DEFAULT 0,
  ranking_score REAL NOT NULL DEFAULT 0,
  ranking_version TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, content_id)
);

CREATE TABLE IF NOT EXISTS platform_media (
  tenant_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  content_id TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video','audio','document','other')),
  object_key TEXT NOT NULL,
  mime_type TEXT,
  byte_size INTEGER CHECK (byte_size >= 0),
  width INTEGER CHECK (width >= 0),
  height INTEGER CHECK (height >= 0),
  duration_ms INTEGER CHECK (duration_ms >= 0),
  thumbnail_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_media_content
  ON platform_media(tenant_id, content_id, created_at, media_id);

CREATE TABLE IF NOT EXISTS platform_content_tags (
  tenant_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, content_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_content_tags_tag
  ON platform_content_tags(tenant_id, tag_id, created_at DESC, content_id DESC);

CREATE TABLE IF NOT EXISTS platform_content_topics (
  tenant_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, content_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_content_topics_topic
  ON platform_content_topics(tenant_id, topic_id, created_at DESC, content_id DESC);

CREATE TABLE IF NOT EXISTS platform_content_channels (
  tenant_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, content_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_content_channels_channel
  ON platform_content_channels(tenant_id, channel_id, created_at DESC, content_id DESC);

CREATE TABLE IF NOT EXISTS platform_follows (
  tenant_id TEXT NOT NULL,
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, follower_id, followee_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_follows_followee
  ON platform_follows(tenant_id, followee_id, created_at DESC, follower_id DESC);

CREATE TABLE IF NOT EXISTS platform_comments (
  tenant_id TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parent_comment_id TEXT,
  body_ref TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('pending','published','hidden','blocked','deleted')),
  risk_level INTEGER NOT NULL DEFAULT 0 CHECK (risk_level >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_comments_content
  ON platform_comments(tenant_id, content_id, created_at DESC, comment_id DESC);

CREATE INDEX IF NOT EXISTS idx_platform_comments_parent
  ON platform_comments(tenant_id, parent_comment_id, created_at ASC, comment_id ASC);

CREATE TABLE IF NOT EXISTS platform_reactions (
  tenant_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like','bookmark')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, content_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_platform_reactions_user
  ON platform_reactions(tenant_id, user_id, reaction_type, updated_at DESC, content_id DESC);

CREATE TABLE IF NOT EXISTS platform_shares (
  tenant_id TEXT NOT NULL,
  share_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  user_id TEXT,
  channel TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, share_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_shares_content
  ON platform_shares(tenant_id, content_id, created_at DESC, share_id DESC);

CREATE TABLE IF NOT EXISTS platform_events (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  user_id TEXT,
  content_id TEXT,
  event_type TEXT NOT NULL,
  event_time TEXT NOT NULL,
  idempotency_key TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, event_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_events_idempotency
  ON platform_events(tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_events_content_time
  ON platform_events(tenant_id, content_id, event_time DESC, event_id DESC);

CREATE INDEX IF NOT EXISTS idx_platform_events_user_time
  ON platform_events(tenant_id, user_id, event_time DESC, event_id DESC);

CREATE TABLE IF NOT EXISTS platform_feed_candidates (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  source TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  reason_code TEXT,
  ranking_version TEXT,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_at TEXT,
  PRIMARY KEY (tenant_id, user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_feed_candidates_user
  ON platform_feed_candidates(tenant_id, user_id, score DESC, generated_at DESC, content_id DESC);

CREATE TABLE IF NOT EXISTS platform_moderation (
  tenant_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('content','comment','user','author','media')),
  target_id TEXT NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected','blocked','review')),
  risk_level INTEGER NOT NULL DEFAULT 0 CHECK (risk_level >= 0),
  reason_code TEXT,
  reviewer_type TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_moderation_queue
  ON platform_moderation(tenant_id, moderation_status, risk_level DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS platform_schema_meta (
  meta_key TEXT PRIMARY KEY,
  meta_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('content_platform_schema_version','1',CURRENT_TIMESTAMP);
