PRAGMA foreign_keys = ON;

-- D1-Fabric Notification Tables
-- Purpose: per-user notification inbox and per-user notification preferences.
-- Notifications are Tier B (durable asynchronous): generated via the outbox
-- pattern from authoritative events, not as part of the triggering write
-- transaction, so they do not block publication.
-- Routing: tenant_id + user_id (notification recipient's shard).

CREATE TABLE IF NOT EXISTS platform_notifications (
  tenant_id       TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  type            TEXT NOT NULL,
  actor_id        TEXT,
  target_type     TEXT,
  target_id       TEXT,
  content_json    TEXT,
  is_read         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, notification_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_notifications_user
  ON platform_notifications(tenant_id, user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_notification_settings (
  tenant_id    TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  push_like    INTEGER NOT NULL DEFAULT 1,
  push_comment INTEGER NOT NULL DEFAULT 1,
  push_follow  INTEGER NOT NULL DEFAULT 1,
  push_system  INTEGER NOT NULL DEFAULT 1,
  updated_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, user_id)
);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('notifications_schema_version', '1', CURRENT_TIMESTAMP);
