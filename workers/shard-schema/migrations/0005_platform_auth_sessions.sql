PRAGMA foreign_keys = ON;

-- D1-Fabric Authentication & Session Tables
-- Purpose: user login sessions, device registration, and third-party OAuth
-- bindings. All credentials are stored as hashes only (Security Contract §7:
-- secrets MUST NOT be stored in source, logged, returned, or embedded in
-- persistent business records).
-- Routing: tenant_id + user_id (colocated with platform_users).

CREATE TABLE IF NOT EXISTS platform_user_sessions (
  tenant_id     TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  device_id     TEXT NOT NULL,
  token_hash    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  ip_hash       TEXT,
  user_agent    TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at    TEXT,
  PRIMARY KEY (tenant_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_sessions_user
  ON platform_user_sessions(tenant_id, user_id, last_active DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_sessions_token
  ON platform_user_sessions(tenant_id, token_hash);

CREATE TABLE IF NOT EXISTS platform_user_devices (
  tenant_id     TEXT NOT NULL,
  device_id     TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  platform      TEXT NOT NULL,
  push_token    TEXT,
  push_enabled  INTEGER NOT NULL DEFAULT 1,
  app_version   TEXT,
  os_version    TEXT,
  last_active   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_devices_user
  ON platform_user_devices(tenant_id, user_id);

CREATE TABLE IF NOT EXISTS platform_oauth_bindings (
  tenant_id     TEXT NOT NULL,
  provider      TEXT NOT NULL,
  open_id       TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  union_id      TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, provider, open_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_oauth_user
  ON platform_oauth_bindings(tenant_id, provider, user_id);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('auth_schema_version', '1', CURRENT_TIMESTAMP);
