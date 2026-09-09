PRAGMA foreign_keys = ON;

-- Publication atomicity contract.
-- A publish request is an explicit state machine. Content must not become
-- published unless the publication transaction has validated all required
-- metadata/media references on the authoritative shard.
CREATE TABLE IF NOT EXISTS platform_publish_operations (
  tenant_id TEXT NOT NULL,
  publish_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  expected_asset_count INTEGER NOT NULL DEFAULT 0 CHECK (expected_asset_count >= 0),
  validated_asset_count INTEGER NOT NULL DEFAULT 0 CHECK (validated_asset_count >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMMITTED','FAILED','EXPIRED')),
  request_hash TEXT NOT NULL,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  committed_at TEXT,
  PRIMARY KEY (tenant_id, publish_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_publish_idempotency
  ON platform_publish_operations(tenant_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_platform_publish_content
  ON platform_publish_operations(tenant_id, content_id, created_at DESC, publish_id DESC);

CREATE TABLE IF NOT EXISTS platform_publish_assets (
  tenant_id TEXT NOT NULL,
  publish_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  asset_role TEXT NOT NULL CHECK (asset_role IN ('cover','body','gallery','video','audio','thumbnail','attachment')),
  asset_order INTEGER NOT NULL DEFAULT 0 CHECK (asset_order >= 0),
  required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, publish_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_publish_assets_order
  ON platform_publish_assets(tenant_id, publish_id, asset_order ASC, media_id ASC);

-- A committed publication is auditable and retry-safe. The publish worker/API
-- must transition the operation and content status in one D1 transaction.
CREATE TABLE IF NOT EXISTS platform_publish_failures (
  tenant_id TEXT NOT NULL,
  publish_id TEXT NOT NULL,
  error_code TEXT NOT NULL,
  retryable INTEGER NOT NULL CHECK (retryable IN (0,1)),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, publish_id, error_code, created_at)
);

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('publish_atomicity_version','1',CURRENT_TIMESTAMP);
