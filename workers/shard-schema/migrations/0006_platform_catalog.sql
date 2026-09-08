PRAGMA foreign_keys = ON;

-- D1-Fabric Catalog Entity Tables
-- Purpose: first-class category/channel, tag, and topic entities. V1 only had
-- mapping tables (platform_content_tags/topics/channels) without entity rows.
-- These are reference data; tenant-scoped.

CREATE TABLE IF NOT EXISTS platform_categories (
  tenant_id     TEXT NOT NULL,
  category_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  icon_url      TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_categories_sort
  ON platform_categories(tenant_id, active, sort_order);

CREATE TABLE IF NOT EXISTS platform_tags (
  tenant_id     TEXT NOT NULL,
  tag_id        TEXT NOT NULL,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'user',
  use_count     INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, tag_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_tags_name
  ON platform_tags(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_platform_tags_use
  ON platform_tags(tenant_id, use_count DESC);

CREATE TABLE IF NOT EXISTS platform_topics (
  tenant_id     TEXT NOT NULL,
  topic_id      TEXT NOT NULL,
  name          TEXT NOT NULL,
  heat          REAL NOT NULL DEFAULT 0,
  content_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_topics_heat
  ON platform_topics(tenant_id, heat DESC);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('catalog_schema_version', '1', CURRENT_TIMESTAMP);
