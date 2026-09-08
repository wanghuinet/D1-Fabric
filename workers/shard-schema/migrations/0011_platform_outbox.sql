PRAGMA foreign_keys = ON;

-- D1-Fabric Transactional Outbox
-- Purpose: durable intent for asynchronous side effects required by committed
-- transactions (Content Platform Contract: Transactional outbox / durable
-- intent — mandatory). The outbox row is written in the SAME local D1
-- transaction as the business mutation; a downstream relay consumes it
-- at-least-once. Consumers MUST be idempotent by stable event identity.
-- Routing: tenant_id + aggregate_id — MUST match the triggering entity's
-- routing key so the outbox write stays inside the same transaction boundary.

CREATE TABLE IF NOT EXISTS platform_outbox (
  tenant_id      TEXT NOT NULL,
  event_id       TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id   TEXT NOT NULL,
  event_type     TEXT NOT NULL,
  payload_json   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  retry_count    INTEGER NOT NULL DEFAULT 0,
  max_retries    INTEGER NOT NULL DEFAULT 5,
  next_retry_at  TEXT,
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_outbox_status
  ON platform_outbox(tenant_id, status, next_retry_at, created_at);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('outbox_schema_version', '1', CURRENT_TIMESTAMP);
