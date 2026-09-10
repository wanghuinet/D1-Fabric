import assert from "node:assert/strict";
import test from "node:test";
import {
  assertWriteEpoch,
  ControlPlaneError,
  getLkg,
  publishSnapshot,
  validateSnapshot,
  type ControlSnapshot,
  type ControlStore,
} from "../src/control.ts";

class MemoryStore implements ControlStore {
  private readonly snapshots = new Map<string, ControlSnapshot>();
  private head: { configVersion: number; epoch: number } | null = null;

  async currentHead() { return this.head; }
  async publish(snapshot: ControlSnapshot) {
    if (this.snapshots.has(`${snapshot.configVersion}:${snapshot.epoch}`)) throw new Error("duplicate snapshot");
    this.snapshots.set(`${snapshot.configVersion}:${snapshot.epoch}`, structuredClone(snapshot));
    this.head = { configVersion: snapshot.configVersion, epoch: snapshot.epoch };
  }
  async get(key: { configVersion: number; epoch: number }) {
    return this.snapshots.get(`${key.configVersion}:${key.epoch}`) ?? null;
  }
  async latestLkg(now: number) {
    return [...this.snapshots.values()]
      .filter((s) => !s.revoked && s.validationStatus === "VALIDATED" && now >= s.activationTime && now < s.expiryTime)
      .sort((a, b) => b.configVersion - a.configVersion || b.epoch - a.epoch)[0] ?? null;
  }
  async revoke(key: { configVersion: number; epoch: number }) {
    const snapshot = this.snapshots.get(`${key.configVersion}:${key.epoch}`);
    if (!snapshot || snapshot.revoked) return false;
    snapshot.revoked = true;
    return true;
  }
}

function snapshot(overrides: Partial<ControlSnapshot> = {}): ControlSnapshot {
  return {
    configVersion: 1,
    epoch: 1,
    activationTime: 1_000,
    expiryTime: 10_000,
    validationStatus: "VALIDATED",
    source: "test",
    revoked: false,
    payload: { placement: { logical: 64 }, capacity: { maxFanout: 8 } },
    ...overrides,
  };
}

test("rejects expired publication", () => {
  assert.throws(() => validateSnapshot(snapshot({ expiryTime: 100 }), 100), (error: unknown) =>
    error instanceof ControlPlaneError && error.code === "INVALID_SNAPSHOT");
});

test("publishes monotonically increasing control snapshots", async () => {
  const store = new MemoryStore();
  await publishSnapshot(store, snapshot(), 2_000);
  await publishSnapshot(store, snapshot({ configVersion: 2, epoch: 2 }), 2_001);
  assert.deepEqual(await store.currentHead(), { configVersion: 2, epoch: 2 });
});

test("rejects stale version and epoch", async () => {
  const store = new MemoryStore();
  await publishSnapshot(store, snapshot(), 2_000);
  await assert.rejects(() => publishSnapshot(store, snapshot({ configVersion: 2, epoch: 1 }), 2_001), (error: unknown) =>
    error instanceof ControlPlaneError && error.code === "STALE_CONTROL_EPOCH");
  await assert.rejects(() => publishSnapshot(store, snapshot({ configVersion: 1, epoch: 2 }), 2_001), (error: unknown) =>
    error instanceof ControlPlaneError && error.code === "STALE_CONTROL_VERSION");
});

test("LKG excludes expired and revoked snapshots", async () => {
  const store = new MemoryStore();
  await publishSnapshot(store, snapshot(), 2_000);
  assert.equal((await getLkg(store, 2_001)).epoch, 1);
  assert.equal(await store.revoke({ configVersion: 1, epoch: 1 }), true);
  await assert.rejects(() => getLkg(store, 2_002), (error: unknown) =>
    error instanceof ControlPlaneError && error.code === "NO_VALID_LKG");
});

test("write epoch requires the exact active epoch", async () => {
  const store = new MemoryStore();
  await publishSnapshot(store, snapshot(), 2_000);
  const active = await store.get({ configVersion: 1, epoch: 1 });
  assert.equal(assertWriteEpoch(active, 1, 2_001).epoch, 1);
  assert.throws(() => assertWriteEpoch(active, 2, 2_001), (error: unknown) =>
    error instanceof ControlPlaneError && error.code === "STALE_CONTROL_EPOCH");
  assert.throws(() => assertWriteEpoch(active, 1, 10_000), (error: unknown) =>
    error instanceof ControlPlaneError && error.code === "CONTROL_EPOCH_NOT_ACTIVE");
});

test("rejects oversized payload and source", () => {
  const largePayload = { data: "x".repeat(512 * 1024) };
  assert.throws(() => validateSnapshot(snapshot({ payload: largePayload }), 2_000), (error: unknown) =>
    error instanceof ControlPlaneError && error.code === "INVALID_SNAPSHOT");
  assert.throws(() => validateSnapshot(snapshot({ source: "x".repeat(257) }), 2_000), (error: unknown) =>
    error instanceof ControlPlaneError && error.code === "INVALID_SNAPSHOT");
});
