import { ControlPlaneError, type ControlSnapshot, type ControlStore } from "./control.ts";

export interface D1DatabaseLike {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
  batch(statements: Array<unknown>): Promise<unknown[]>;
}

interface SnapshotRow {
  config_version: number;
  epoch: number;
  activation_time: number;
  expiry_time: number;
  validation_status: "VALIDATED";
  source: string;
  revoked: number;
  payload_json: string;
}

function fromRow(row: SnapshotRow): ControlSnapshot {
  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(row.payload_json);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("payload must be an object");
    payload = parsed as Record<string, unknown>;
  } catch {
    throw new Error("invalid control snapshot payload in storage");
  }
  return {
    configVersion: row.config_version,
    epoch: row.epoch,
    activationTime: row.activation_time,
    expiryTime: row.expiry_time,
    validationStatus: row.validation_status,
    source: row.source,
    revoked: row.revoked !== 0,
    payload,
  };
}

export class D1ControlStore implements ControlStore {
  constructor(private readonly db: D1DatabaseLike) {}

  async currentHead(): Promise<{ configVersion: number; epoch: number } | null> {
    const row = await this.db.prepare(
      "SELECT config_version, epoch FROM control_head WHERE id = 1",
    ).bind().first<{ config_version: number; epoch: number }>();
    return row ? { configVersion: row.config_version, epoch: row.epoch } : null;
  }

  async publish(snapshot: ControlSnapshot): Promise<void> {
    const payload = JSON.stringify(snapshot.payload);
    const insert = this.db.prepare(
      "INSERT OR IGNORE INTO control_snapshots (config_version, epoch, activation_time, expiry_time, validation_status, source, revoked, payload_json) VALUES (?, ?, ?, ?, 'VALIDATED', ?, 0, ?)",
    ).bind(
      snapshot.configVersion,
      snapshot.epoch,
      snapshot.activationTime,
      snapshot.expiryTime,
      snapshot.source,
      payload,
    );
    const head = this.db.prepare(
      "INSERT INTO control_head (id, config_version, epoch) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET config_version=excluded.config_version, epoch=excluded.epoch WHERE control_head.config_version < excluded.config_version AND control_head.epoch < excluded.epoch",
    ).bind(snapshot.configVersion, snapshot.epoch);
    await this.db.batch([insert, head]);

    const active = await this.currentHead();
    if (!active || active.configVersion !== snapshot.configVersion || active.epoch !== snapshot.epoch) {
      throw new ControlPlaneError("CONTROL_HEAD_ADVANCE_RACE", "control snapshot was stored but could not become the active head");
    }
  }

  async get(key: { configVersion: number; epoch: number }): Promise<ControlSnapshot | null> {
    const row = await this.db.prepare(
      "SELECT config_version, epoch, activation_time, expiry_time, validation_status, source, revoked, payload_json FROM control_snapshots WHERE config_version = ? AND epoch = ?",
    ).bind(key.configVersion, key.epoch).first<SnapshotRow>();
    return row ? fromRow(row) : null;
  }

  async latestLkg(now: number): Promise<ControlSnapshot | null> {
    const row = await this.db.prepare(
      "SELECT config_version, epoch, activation_time, expiry_time, validation_status, source, revoked, payload_json FROM control_snapshots WHERE validation_status = 'VALIDATED' AND revoked = 0 AND activation_time <= ? AND expiry_time > ? ORDER BY config_version DESC, epoch DESC LIMIT 1",
    ).bind(now, now).first<SnapshotRow>();
    return row ? fromRow(row) : null;
  }

  async revoke(key: { configVersion: number; epoch: number }): Promise<boolean> {
    const result = await this.db.prepare(
      "UPDATE control_snapshots SET revoked = 1 WHERE config_version = ? AND epoch = ? AND revoked = 0",
    ).bind(key.configVersion, key.epoch).run() as { meta?: { changes?: number } };
    return (result.meta?.changes ?? 0) > 0;
  }
}
