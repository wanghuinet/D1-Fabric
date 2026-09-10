import assert from "node:assert/strict";
import { test } from "node:test";
import { executeBoundedRead, ReadExecutionError, type CacheEntry, type D1DatabaseLike, type ReadExecutionInput } from "../src/read.ts";

const now = () => Date.now();

function integrity(entry: Omit<CacheEntry, "integrity">): string {
  let hash = 2166136261;
  const text = JSON.stringify({
    tenantId: entry.tenantId,
    principalScope: entry.principalScope,
    operation: entry.operation,
    contractVersion: entry.contractVersion,
    shapeVersion: entry.shapeVersion,
    expiresAt: entry.expiresAt,
    payload: entry.payload,
  });
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const db: D1DatabaseLike = {
  prepare() {
    return {
      bind() { return this; },
      async all() { return { results: [{ id: "1" }, { id: "2" }] }; },
    };
  },
};

function makeInput(overrides: Partial<ReadExecutionInput<{ id: string }>> = {}): ReadExecutionInput<{ id: string }> {
  return {
    requestId: "req-1",
    tenantId: "tenant-1",
    principalScope: "content:read",
    operation: "content.list",
    contractVersion: "D1F-3.0-MASTER-v1.0",
    shapeVersion: "shape-1",
    placement: { logicalTargetId: "logical-1", executionEpoch: "epoch-7", expiresAt: now() + 10_000, fenced: false },
    deadlineAt: now() + 5_000,
    budget: { d1Statements: 1, rowsRead: 10, payloadBytes: 1024 },
    cachePolicy: { cacheAllowed: true, cacheTermination: true, contractVersion: "D1F-3.0-MASTER-v1.0", shapeVersion: "shape-1" },
    statement: "SELECT id FROM content WHERE tenant_id = ?",
    bindings: ["tenant-1"],
    db,
    ...overrides,
  };
}

function cache(payload: unknown, overrides: Partial<CacheEntry> = {}): CacheEntry {
  const base: Omit<CacheEntry, "integrity"> = {
    tenantId: "tenant-1",
    principalScope: "content:read",
    operation: "content.list",
    contractVersion: "D1F-3.0-MASTER-v1.0",
    shapeVersion: "shape-1",
    expiresAt: now() + 10_000,
    payload,
    ...overrides,
  };
  return { ...base, integrity: integrity(base) };
}

test("P07.1 valid bounded D1 read executes once", async () => {
  let calls = 0;
  const countedDb: D1DatabaseLike = { prepare() { calls += 1; return db.prepare("x"); } };
  const result = await executeBoundedRead(makeInput({ db: countedDb, cacheEntry: undefined }));
  assert.equal(result.status, "READ_EXECUTED");
  assert.equal(result.d1Statements, 1);
  assert.equal(result.actualFanout, 1);
  assert.equal(result.rowsRead, 2);
  assert.equal(calls, 1);
});

test("P07.1 valid cache HIT terminates with zero D1 work", async () => {
  let calls = 0;
  const neverDb: D1DatabaseLike = { prepare() { calls += 1; throw new Error("must not execute D1"); } };
  const result = await executeBoundedRead(makeInput({ db: neverDb, cacheEntry: cache([{ id: "cached" }]) }));
  assert.equal(result.status, "CACHE_TERMINATED");
  assert.equal(result.cacheResult, "HIT");
  assert.equal(result.cacheTermination, true);
  assert.equal(result.d1Statements, 0);
  assert.equal(result.rowsRead, 0);
  assert.equal(result.rowsWritten, 0);
  assert.equal(calls, 0);
});

test("P07.1 cache miss continues to approved D1 path", async () => {
  const expired = cache([{ id: "old" }], { expiresAt: now() - 1 });
  const result = await executeBoundedRead(makeInput({ cacheEntry: expired }));
  assert.equal(result.status, "READ_EXECUTED");
  assert.equal(result.cacheResult, "MISS");
  assert.equal(result.d1Statements, 1);
});

test("P07.1 rejects missing logical target", async () => {
  await assert.rejects(() => executeBoundedRead(makeInput({ placement: { ...makeInput().placement, logicalTargetId: "" } })), (e: unknown) => e instanceof ReadExecutionError && e.code === "READ_TARGET_MISSING");
});

test("P07.1 rejects fenced and expired epochs", async () => {
  await assert.rejects(() => executeBoundedRead(makeInput({ placement: { ...makeInput().placement, fenced: true } })), (e: unknown) => e instanceof ReadExecutionError && e.code === "CONTROL_EPOCH_FENCED");
  await assert.rejects(() => executeBoundedRead(makeInput({ placement: { ...makeInput().placement, expiresAt: now() - 1 } })), (e: unknown) => e instanceof ReadExecutionError && e.code === "CONTROL_SNAPSHOT_EXPIRED");
});

test("P07.1 rejects insufficient statement, row, and payload budgets", async () => {
  await assert.rejects(() => executeBoundedRead(makeInput({ cacheEntry: undefined, budget: { d1Statements: 0, rowsRead: 10, payloadBytes: 1024 } })), (e: unknown) => e instanceof ReadExecutionError && e.code === "BUDGET_INVALID");
  await assert.rejects(() => executeBoundedRead(makeInput({ cacheEntry: undefined, budget: { d1Statements: 1, rowsRead: 1, payloadBytes: 1024 } })), (e: unknown) => e instanceof ReadExecutionError && e.code === "BUDGET_EXCEEDED");
  await assert.rejects(() => executeBoundedRead(makeInput({ cacheEntry: undefined, budget: { d1Statements: 1, rowsRead: 10, payloadBytes: 1 } })), (e: unknown) => e instanceof ReadExecutionError && e.code === "BUDGET_EXCEEDED");
});

test("P07.1 rejects expired deadline before D1 dispatch", async () => {
  let calls = 0;
  const countedDb: D1DatabaseLike = { prepare() { calls += 1; return db.prepare("x"); } };
  await assert.rejects(() => executeBoundedRead(makeInput({ db: countedDb, cacheEntry: undefined, deadlineAt: now() - 1 })), (e: unknown) => e instanceof ReadExecutionError && e.code === "DEADLINE_EXCEEDED");
  assert.equal(calls, 0);
});

test("P07.1 D1 failure is propagated without retry", async () => {
  let calls = 0;
  const failingDb: D1DatabaseLike = { prepare() { calls += 1; return { bind() { return this; }, async all() { throw new Error("failure"); } }; } };
  await assert.rejects(() => executeBoundedRead(makeInput({ db: failingDb, cacheEntry: undefined })), (e: unknown) => e instanceof ReadExecutionError && e.code === "READ_EXECUTION_FAILED");
  assert.equal(calls, 1);
});

test("P07.1 rejects cross-tenant, cross-principal, cross-operation and version-mismatched cache", async () => {
  await assert.rejects(() => executeBoundedRead(makeInput({ cacheEntry: cache(["x"], { tenantId: "tenant-2" }) })), (e: unknown) => e instanceof ReadExecutionError && e.code === "CACHE_BINDING_INVALID");
  await assert.rejects(() => executeBoundedRead(makeInput({ cacheEntry: cache(["x"], { principalScope: "other" }) })), (e: unknown) => e instanceof ReadExecutionError && e.code === "CACHE_BINDING_INVALID");
  await assert.rejects(() => executeBoundedRead(makeInput({ cacheEntry: cache(["x"], { operation: "other" }) })), (e: unknown) => e instanceof ReadExecutionError && e.code === "CACHE_BINDING_INVALID");
  await assert.rejects(() => executeBoundedRead(makeInput({ cacheEntry: cache(["x"], { contractVersion: "old" }) })), (e: unknown) => e instanceof ReadExecutionError && e.code === "CACHE_BINDING_INVALID");
});

test("P07.1 rejects tampered cache integrity", async () => {
  const entry = cache([{ id: "cached" }]);
  await assert.rejects(() => executeBoundedRead(makeInput({ cacheEntry: { ...entry, integrity: "tampered" } })), (e: unknown) => e instanceof ReadExecutionError && e.code === "CACHE_BINDING_INVALID");
});

test("P07.1 does not expose physical topology", async () => {
  const result = await executeBoundedRead(makeInput({ cacheEntry: undefined }));
  const text = JSON.stringify(result).toLowerCase();
  for (const forbidden of ["databaseid", "physicalshard", "sqltopology", "workergraph"]) assert.equal(text.includes(forbidden), false);
});
