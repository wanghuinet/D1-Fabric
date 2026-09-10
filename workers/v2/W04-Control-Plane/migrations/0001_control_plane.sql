PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS control_snapshots (
  config_version INTEGER NOT NULL,
  epoch INTEGER NOT NULL,
  activation_time INTEGER NOT NULL,
  expiry_time INTEGER NOT NULL,
  validation_status TEXT NOT NULL CHECK (validation_status = 'VALIDATED'),
  source TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0 CHECK (revoked IN (0, 1)),
  payload_json TEXT NOT NULL,
  PRIMARY KEY (config_version, epoch)
);

CREATE INDEX IF NOT EXISTS idx_control_snapshots_lkg
  ON control_snapshots(validation_status, revoked, activation_time, expiry_time, config_version DESC, epoch DESC);

CREATE TABLE IF NOT EXISTS control_head (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config_version INTEGER NOT NULL,
  epoch INTEGER NOT NULL,
  FOREIGN KEY (config_version, epoch)
    REFERENCES control_snapshots(config_version, epoch)
);
