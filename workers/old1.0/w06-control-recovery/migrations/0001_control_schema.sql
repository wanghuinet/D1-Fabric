PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS fabric_shards (
  shard_id INTEGER PRIMARY KEY,
  physical_db TEXT NOT NULL,
  owner TEXT NOT NULL,
  epoch INTEGER NOT NULL CHECK (epoch >= 1),
  state TEXT NOT NULL CHECK (state IN ('CREATING','ACTIVE','SPLITTING','MERGING','MIGRATING','DRAINING','RETIRED','FAILED')),
  logical_shard_count INTEGER NOT NULL DEFAULT 64 CHECK (logical_shard_count > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fabric_shards_state ON fabric_shards(state);
CREATE INDEX IF NOT EXISTS idx_fabric_shards_physical_db ON fabric_shards(physical_db);

CREATE TABLE IF NOT EXISTS fabric_migrations (
  migration_id TEXT PRIMARY KEY,
  shard_id INTEGER NOT NULL,
  source_db TEXT NOT NULL,
  target_db TEXT NOT NULL,
  from_epoch INTEGER NOT NULL CHECK (from_epoch >= 1),
  to_epoch INTEGER NOT NULL CHECK (to_epoch = from_epoch + 1),
  phase TEXT NOT NULL CHECK (phase IN ('PLAN','PREPARE','COPY','VERIFY','FENCE','COMMIT_OWNERSHIP','ADVANCE_EPOCH','SERVE','RETIRE_SOURCE','FAILED','DONE')),
  idempotency_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shard_id) REFERENCES fabric_shards(shard_id)
);

CREATE INDEX IF NOT EXISTS idx_fabric_migrations_shard ON fabric_migrations(shard_id);
CREATE INDEX IF NOT EXISTS idx_fabric_migrations_phase ON fabric_migrations(phase);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fabric_migrations_idempotency ON fabric_migrations(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS fabric_recovery (
  recovery_id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('NORMAL','DETECTED','ISOLATED','DIAGNOSING','RECOVERING','VERIFYING','CANARY','RESTORING_ADMISSION')),
  reason TEXT,
  observed_epoch INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fabric_recovery_subject ON fabric_recovery(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_fabric_recovery_status ON fabric_recovery(status);

CREATE TABLE IF NOT EXISTS fabric_control_meta (
  meta_key TEXT PRIMARY KEY,
  meta_value TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO fabric_control_meta(meta_key, meta_value, version) VALUES
  ('schema_version','1',1),
  ('logical_shard_count','64',1),
  ('physical_shard_count','8',1),
  ('control_plane_version','1',1);

-- Initial 64 logical shards distributed deterministically across 8 physical D1s.
INSERT OR IGNORE INTO fabric_shards(shard_id, physical_db, owner, epoch, state, logical_shard_count)
VALUES
  (0,'d1-fabric-shard-01','shard-01',1,'ACTIVE',64),
  (1,'d1-fabric-shard-02','shard-02',1,'ACTIVE',64),
  (2,'d1-fabric-shard-03','shard-03',1,'ACTIVE',64),
  (3,'d1-fabric-shard-04','shard-04',1,'ACTIVE',64),
  (4,'d1-fabric-shard-05','shard-05',1,'ACTIVE',64),
  (5,'d1-fabric-shard-06','shard-06',1,'ACTIVE',64),
  (6,'d1-fabric-shard-07','shard-07',1,'ACTIVE',64),
  (7,'d1-fabric-shard-08','shard-08',1,'ACTIVE',64),
  (8,'d1-fabric-shard-01','shard-01',1,'ACTIVE',64),
  (9,'d1-fabric-shard-02','shard-02',1,'ACTIVE',64),
  (10,'d1-fabric-shard-03','shard-03',1,'ACTIVE',64),
  (11,'d1-fabric-shard-04','shard-04',1,'ACTIVE',64),
  (12,'d1-fabric-shard-05','shard-05',1,'ACTIVE',64),
  (13,'d1-fabric-shard-06','shard-06',1,'ACTIVE',64),
  (14,'d1-fabric-shard-07','shard-07',1,'ACTIVE',64),
  (15,'d1-fabric-shard-08','shard-08',1,'ACTIVE',64),
  (16,'d1-fabric-shard-01','shard-01',1,'ACTIVE',64),
  (17,'d1-fabric-shard-02','shard-02',1,'ACTIVE',64),
  (18,'d1-fabric-shard-03','shard-03',1,'ACTIVE',64),
  (19,'d1-fabric-shard-04','shard-04',1,'ACTIVE',64),
  (20,'d1-fabric-shard-05','shard-05',1,'ACTIVE',64),
  (21,'d1-fabric-shard-06','shard-06',1,'ACTIVE',64),
  (22,'d1-fabric-shard-07','shard-07',1,'ACTIVE',64),
  (23,'d1-fabric-shard-08','shard-08',1,'ACTIVE',64),
  (24,'d1-fabric-shard-01','shard-01',1,'ACTIVE',64),
  (25,'d1-fabric-shard-02','shard-02',1,'ACTIVE',64),
  (26,'d1-fabric-shard-03','shard-03',1,'ACTIVE',64),
  (27,'d1-fabric-shard-04','shard-04',1,'ACTIVE',64),
  (28,'d1-fabric-shard-05','shard-05',1,'ACTIVE',64),
  (29,'d1-fabric-shard-06','shard-06',1,'ACTIVE',64),
  (30,'d1-fabric-shard-07','shard-07',1,'ACTIVE',64),
  (31,'d1-fabric-shard-08','shard-08',1,'ACTIVE',64),
  (32,'d1-fabric-shard-01','shard-01',1,'ACTIVE',64),
  (33,'d1-fabric-shard-02','shard-02',1,'ACTIVE',64),
  (34,'d1-fabric-shard-03','shard-03',1,'ACTIVE',64),
  (35,'d1-fabric-shard-04','shard-04',1,'ACTIVE',64),
  (36,'d1-fabric-shard-05','shard-05',1,'ACTIVE',64),
  (37,'d1-fabric-shard-06','shard-06',1,'ACTIVE',64),
  (38,'d1-fabric-shard-07','shard-07',1,'ACTIVE',64),
  (39,'d1-fabric-shard-08','shard-08',1,'ACTIVE',64),
  (40,'d1-fabric-shard-01','shard-01',1,'ACTIVE',64),
  (41,'d1-fabric-shard-02','shard-02',1,'ACTIVE',64),
  (42,'d1-fabric-shard-03','shard-03',1,'ACTIVE',64),
  (43,'d1-fabric-shard-04','shard-04',1,'ACTIVE',64),
  (44,'d1-fabric-shard-05','shard-05',1,'ACTIVE',64),
  (45,'d1-fabric-shard-06','shard-06',1,'ACTIVE',64),
  (46,'d1-fabric-shard-07','shard-07',1,'ACTIVE',64),
  (47,'d1-fabric-shard-08','shard-08',1,'ACTIVE',64),
  (48,'d1-fabric-shard-01','shard-01',1,'ACTIVE',64),
  (49,'d1-fabric-shard-02','shard-02',1,'ACTIVE',64),
  (50,'d1-fabric-shard-03','shard-03',1,'ACTIVE',64),
  (51,'d1-fabric-shard-04','shard-04',1,'ACTIVE',64),
  (52,'d1-fabric-shard-05','shard-05',1,'ACTIVE',64),
  (53,'d1-fabric-shard-06','shard-06',1,'ACTIVE',64),
  (54,'d1-fabric-shard-07','shard-07',1,'ACTIVE',64),
  (55,'d1-fabric-shard-08','shard-08',1,'ACTIVE',64),
  (56,'d1-fabric-shard-01','shard-01',1,'ACTIVE',64),
  (57,'d1-fabric-shard-02','shard-02',1,'ACTIVE',64),
  (58,'d1-fabric-shard-03','shard-03',1,'ACTIVE',64),
  (59,'d1-fabric-shard-04','shard-04',1,'ACTIVE',64),
  (60,'d1-fabric-shard-05','shard-05',1,'ACTIVE',64),
  (61,'d1-fabric-shard-06','shard-06',1,'ACTIVE',64),
  (62,'d1-fabric-shard-07','shard-07',1,'ACTIVE',64),
  (63,'d1-fabric-shard-08','shard-08',1,'ACTIVE',64);
