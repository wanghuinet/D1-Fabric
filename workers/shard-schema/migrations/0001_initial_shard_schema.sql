PRAGMA foreign_keys = ON;

-- Common logical-record envelope. Business payload/schema is intentionally opaque.
CREATE TABLE IF NOT EXISTS fabric_records (
  namespace TEXT NOT NULL,
  record_key TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, namespace, record_key)
);

CREATE INDEX IF NOT EXISTS idx_fabric_records_namespace
  ON fabric_records(tenant_id, namespace);

CREATE INDEX IF NOT EXISTS idx_fabric_records_updated_at
  ON fabric_records(tenant_id, namespace, updated_at);

-- Idempotency ledger is shard-local: retries for the same routed write
-- cannot create duplicate committed effects on the authoritative shard.
CREATE TABLE IF NOT EXISTS fabric_idempotency (
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS','COMMITTED','FAILED')),
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_fabric_idempotency_updated_at
  ON fabric_idempotency(tenant_id, updated_at);

-- Schema marker allows every physical shard to prove which migration level
-- it has applied without relying on application code conventions.
CREATE TABLE IF NOT EXISTS fabric_schema_meta (
  meta_key TEXT PRIMARY KEY,
  meta_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO fabric_schema_meta(meta_key, meta_value)
VALUES ('schema_version','1');
