CREATE TABLE IF NOT EXISTS d1f_w06_shard_metadata (
  logical_database_id TEXT NOT NULL,
  logical_shard_id TEXT NOT NULL,
  physical_shard_id TEXT NOT NULL,
  topology_version INTEGER NOT NULL,
  lifecycle TEXT NOT NULL,
  capacity_state TEXT NOT NULL,
  creation_timestamp INTEGER NOT NULL,
  last_transition_timestamp INTEGER NOT NULL,
  PRIMARY KEY (logical_database_id, topology_version, logical_shard_id),
  UNIQUE (logical_database_id, topology_version, physical_shard_id),
  CHECK (topology_version > 0),
  CHECK (lifecycle IN ('PROVISIONING', 'ACTIVE', 'DRAINING', 'MIGRATING', 'RETIRED')),
  CHECK (capacity_state IN ('ADMITTED', 'BLOCKED')),
  CHECK (creation_timestamp >= 0),
  CHECK (last_transition_timestamp >= creation_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_d1f_w06_shard_metadata_lookup
  ON d1f_w06_shard_metadata (logical_database_id, topology_version, lifecycle, capacity_state);
