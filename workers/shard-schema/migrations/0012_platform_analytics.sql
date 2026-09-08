PRAGMA foreign_keys = ON;

-- D1-Fabric Analytics & Reporting Tables
-- Purpose: content impression/completion observation events, user interest
-- profile (recommendation features), and user-initiated reports.
-- Consistency tiers:
--   platform_impressions / completions → OBSERVATION (events, not hot-row
--     counter updates; materialized counters are rebuilt from these).
--   platform_user_interests → Tier B (durable async, recommendation features).
--   platform_reports → Tier A (authoritative moderation input).
-- Routing: impressions/completions by tenant_id + content_id; user_interests
-- and reports by tenant_id + user_id / report_id.

CREATE TABLE IF NOT EXISTS platform_impressions (
  tenant_id     TEXT NOT NULL,
  impression_id TEXT NOT NULL,
  user_id       TEXT,
  content_id    TEXT NOT NULL,
  position      INTEGER,
  feed_source   TEXT,
  duration_ms   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, impression_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_impressions_content
  ON platform_impressions(tenant_id, content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_impressions_user
  ON platform_impressions(tenant_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_content_completions (
  tenant_id       TEXT NOT NULL,
  completion_id   TEXT NOT NULL,
  user_id         TEXT,
  content_id      TEXT NOT NULL,
  completion_rate REAL NOT NULL DEFAULT 0,
  duration_ms     INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, completion_id)
);

CREATE TABLE IF NOT EXISTS platform_user_interests (
  tenant_id  TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  tag_id     TEXT NOT NULL,
  score      REAL NOT NULL DEFAULT 0,
  source     TEXT NOT NULL DEFAULT 'behavior',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_user_interests_user
  ON platform_user_interests(tenant_id, user_id, score DESC);

CREATE TABLE IF NOT EXISTS platform_reports (
  tenant_id   TEXT NOT NULL,
  report_id   TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  detail      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, report_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_reports_target
  ON platform_reports(tenant_id, target_type, target_id, status);
CREATE INDEX IF NOT EXISTS idx_platform_reports_status
  ON platform_reports(tenant_id, status, created_at);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('analytics_schema_version', '1', CURRENT_TIMESTAMP);
