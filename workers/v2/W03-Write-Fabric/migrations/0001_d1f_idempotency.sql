CREATE TABLE IF NOT EXISTS __d1f_idempotency (
  tenant_id TEXT NOT NULL,
  principal_scope TEXT NOT NULL,
  operation TEXT NOT NULL,
  operation_version TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  owner_request_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('IN_FLIGHT', 'COMMITTED', 'FAILED')),
  affected_rows INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  committed_at INTEGER,
  PRIMARY KEY (tenant_id, principal_scope, operation, operation_version, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_d1f_idempotency_owner
  ON __d1f_idempotency (tenant_id, principal_scope, owner_request_id);
