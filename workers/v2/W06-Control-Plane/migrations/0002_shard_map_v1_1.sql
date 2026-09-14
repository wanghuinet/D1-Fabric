CREATE TABLE IF NOT EXISTS d1f_w06_shard_map_versions (
  logical_database_id TEXT NOT NULL,
  shard_map_version INTEGER NOT NULL CHECK (shard_map_version > 0),
  control_epoch INTEGER NOT NULL CHECK (control_epoch > 0),
  publication_state TEXT NOT NULL CHECK (publication_state IN ('PREPARED', 'VALIDATED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED')),
  PRIMARY KEY (logical_database_id, shard_map_version)
);

CREATE TABLE IF NOT EXISTS d1f_w06_shard_metadata_v11 (
  logical_database_id TEXT NOT NULL,
  logical_shard_id TEXT NOT NULL,
  physical_shard_id TEXT NOT NULL,
  shard_map_version INTEGER NOT NULL,
  shard_status TEXT NOT NULL,
  keyspace_lower_inclusive TEXT NOT NULL,
  keyspace_upper_exclusive TEXT NOT NULL,
  control_epoch INTEGER NOT NULL,
  capacity_state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (logical_database_id, shard_map_version, logical_shard_id),
  UNIQUE (logical_database_id, shard_map_version, physical_shard_id),
  CHECK (shard_map_version > 0),
  CHECK (shard_status IN ('REGISTERED', 'VALIDATING', 'ACTIVE', 'SPLITTING', 'DRAINING', 'RETIRED')),
  CHECK (keyspace_lower_inclusive < keyspace_upper_exclusive),
  CHECK (control_epoch > 0),
  CHECK (capacity_state IN ('ADMITTED', 'BLOCKED')),
  FOREIGN KEY (logical_database_id, shard_map_version)
    REFERENCES d1f_w06_shard_map_versions(logical_database_id, shard_map_version)
);

CREATE TABLE IF NOT EXISTS d1f_w06_shard_map_head (
  logical_database_id TEXT PRIMARY KEY,
  shard_map_version INTEGER NOT NULL,
  control_epoch INTEGER NOT NULL,
  FOREIGN KEY (logical_database_id, shard_map_version)
    REFERENCES d1f_w06_shard_map_versions(logical_database_id, shard_map_version)
);

CREATE INDEX IF NOT EXISTS idx_d1f_w06_shard_metadata_v11_lookup
  ON d1f_w06_shard_metadata_v11 (logical_database_id, shard_map_version, shard_status, capacity_state);
