export const MAX_SOURCE_BYTES = 256;
export const MAX_PAYLOAD_BYTES = 512 * 1024;
export const MAX_BODY_BYTES = 1024 * 1024;

export type ValidationStatus = "VALIDATED";

export interface ControlSnapshot {
  configVersion: number;
  epoch: number;
  activationTime: number;
  expiryTime: number;
  validationStatus: ValidationStatus;
  source: string;
  revoked: boolean;
  payload: Record<string, unknown>;
}

export interface ControlStore {
  currentHead(): Promise<{ configVersion: number; epoch: number } | null>;
  publish(snapshot: ControlSnapshot): Promise<void>;
  get(snapshot: { configVersion: number; epoch: number }): Promise<ControlSnapshot | null>;
  latestLkg(now: number): Promise<ControlSnapshot | null>;
  revoke(snapshot: { configVersion: number; epoch: number }): Promise<boolean>;
}

export class ControlPlaneError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ControlPlaneError";
    this.code = code;
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function validateSnapshot(snapshot: ControlSnapshot, now: number): void {
  if (!isPositiveInteger(snapshot.configVersion)) throw new ControlPlaneError("INVALID_SNAPSHOT", "configVersion must be a positive safe integer");
  if (!isPositiveInteger(snapshot.epoch)) throw new ControlPlaneError("INVALID_SNAPSHOT", "epoch must be a positive safe integer");
  if (!Number.isFinite(snapshot.activationTime) || !Number.isFinite(snapshot.expiryTime)) throw new ControlPlaneError("INVALID_SNAPSHOT", "activation and expiry times must be finite");
  if (snapshot.activationTime >= snapshot.expiryTime) throw new ControlPlaneError("INVALID_SNAPSHOT", "activationTime must be before expiryTime");
  if (snapshot.expiryTime <= now) throw new ControlPlaneError("INVALID_SNAPSHOT", "snapshot is already expired");
  if (snapshot.validationStatus !== "VALIDATED") throw new ControlPlaneError("INVALID_SNAPSHOT", "snapshot must be VALIDATED");
  if (snapshot.revoked) throw new ControlPlaneError("INVALID_SNAPSHOT", "a revoked snapshot cannot be published");
  if (utf8Bytes(snapshot.source) === 0 || utf8Bytes(snapshot.source) > MAX_SOURCE_BYTES) throw new ControlPlaneError("INVALID_SNAPSHOT", "source exceeds 256 bytes or is empty");
  const payload = JSON.stringify(snapshot.payload);
  if (!payload || utf8Bytes(payload) > MAX_PAYLOAD_BYTES) throw new ControlPlaneError("INVALID_SNAPSHOT", "payload exceeds 512 KiB");
}

export function validateMonotonicHead(
  current: { configVersion: number; epoch: number } | null,
  next: { configVersion: number; epoch: number },
): void {
  if (!current) return;
  if (next.configVersion <= current.configVersion) throw new ControlPlaneError("STALE_CONTROL_VERSION", "configVersion must increase monotonically");
  if (next.epoch <= current.epoch) throw new ControlPlaneError("STALE_CONTROL_EPOCH", "epoch must increase monotonically");
}

export function isLkgEligible(snapshot: ControlSnapshot, now: number): boolean {
  return snapshot.validationStatus === "VALIDATED" &&
    !snapshot.revoked &&
    now >= snapshot.activationTime &&
    now < snapshot.expiryTime;
}

export function assertWriteEpoch(snapshot: ControlSnapshot | null, requestedEpoch: number, now: number): ControlSnapshot {
  if (!snapshot) throw new ControlPlaneError("UNKNOWN_CONTROL_EPOCH", "control epoch is unknown");
  if (snapshot.revoked) throw new ControlPlaneError("REVOKED_CONTROL_EPOCH", "control epoch is revoked");
  if (snapshot.epoch !== requestedEpoch) throw new ControlPlaneError("STALE_CONTROL_EPOCH", "control epoch is stale");
  if (!isLkgEligible(snapshot, now)) throw new ControlPlaneError("CONTROL_EPOCH_NOT_ACTIVE", "control epoch is not active");
  return snapshot;
}

export async function publishSnapshot(store: ControlStore, snapshot: ControlSnapshot, now: number): Promise<void> {
  validateSnapshot(snapshot, now);
  validateMonotonicHead(await store.currentHead(), snapshot);
  await store.publish(snapshot);
}

export async function getLkg(store: ControlStore, now: number): Promise<ControlSnapshot> {
  const snapshot = await store.latestLkg(now);
  if (!snapshot) throw new ControlPlaneError("NO_VALID_LKG", "no valid Last-Known-Good control snapshot is available");
  return snapshot;
}
