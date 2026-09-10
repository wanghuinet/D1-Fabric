import test from "node:test";
import assert from "node:assert/strict";
import { resolvePhysicalTarget, PhysicalTargetResolutionError, type PhysicalTargetEnvironment } from "../src/target.ts";
import type { D1DatabaseLike, D1ResultLike, PreparedStatementLike } from "../src/write.ts";

class FakeDb implements D1DatabaseLike {
  prepare(_sql: string): PreparedStatementLike { throw new Error("not executed"); }
  async batch(_statements: PreparedStatementLike[]): Promise<D1ResultLike[]> { return []; }
}

function env(catalog: unknown, bindings: Record<string, unknown> = {}): PhysicalTargetEnvironment {
  return { PHYSICAL_TARGET_CATALOG_JSON: JSON.stringify(catalog), ...bindings };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    logicalDatabaseId: "db-1",
    logicalShardId: "shard-1",
    physicalShardId: "physical-1",
    topologyVersion: 7,
    ...overrides,
  };
}

function catalog(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    targets: [{
      logicalDatabaseId: "db-1",
      logicalShardId: "shard-1",
      physicalShardId: "physical-1",
      topologyVersion: 7,
      physicalTargetId: "target-1",
      bindingName: "DB_A",
      admitted: true,
      ...overrides,
    }],
  };
}

test("valid target resolves to exactly one deployed D1 binding", () => {
  const db = new FakeDb();
  const resolved = resolvePhysicalTarget(env(catalog(), { DB_A: db }), input());
  assert.equal(resolved.physicalTargetId, "target-1");
  assert.equal(resolved.bindingName, "DB_A");
  assert.equal(resolved.db, db);
});

test("unknown physical target fails closed", () => {
  assert.throws(() => resolvePhysicalTarget(env(catalog(), { DB_A: new FakeDb() }), input({ physicalShardId: "missing" })), (error: unknown) => error instanceof PhysicalTargetResolutionError && error.code === "PHYSICAL_TARGET_UNKNOWN");
});

test("missing deployment binding fails closed", () => {
  assert.throws(() => resolvePhysicalTarget(env(catalog()), input()), (error: unknown) => error instanceof PhysicalTargetResolutionError && error.code === "PHYSICAL_TARGET_BINDING_MISSING");
});

test("wrong topology version never upgrades to the latest target", () => {
  const db = new FakeDb();
  const raw = {
    version: 1,
    targets: [catalog().targets[0], { ...catalog().targets[0], topologyVersion: 8, physicalTargetId: "target-2", bindingName: "DB_B" }],
  };
  assert.throws(() => resolvePhysicalTarget(env(raw, { DB_A: db, DB_B: db }), input({ topologyVersion: 6 })), (error: unknown) => error instanceof PhysicalTargetResolutionError && error.code === "PHYSICAL_TARGET_VERSION_MISMATCH");
});

test("duplicate mapping fails closed before binding lookup", () => {
  const duplicate = catalog().targets[0];
  const raw = { version: 1, targets: [duplicate, duplicate] };
  assert.throws(() => resolvePhysicalTarget(env(raw, { DB_A: new FakeDb() }), input()), (error: unknown) => error instanceof PhysicalTargetResolutionError && error.code === "PHYSICAL_TARGET_CONFLICT");
});

test("non-admitted target fails closed", () => {
  assert.throws(() => resolvePhysicalTarget(env(catalog({ admitted: false }), { DB_A: new FakeDb() }), input()), (error: unknown) => error instanceof PhysicalTargetResolutionError && error.code === "PHYSICAL_TARGET_NOT_ADMITTED");
});

test("caller target override is always rejected", () => {
  assert.throws(() => resolvePhysicalTarget(env(catalog(), { DB_A: new FakeDb() }), input({ physicalTargetOverride: "target-2" })), (error: unknown) => error instanceof PhysicalTargetResolutionError && error.code === "PHYSICAL_TARGET_OVERRIDE_FORBIDDEN");
  assert.throws(() => resolvePhysicalTarget(env(catalog(), { DB_A: new FakeDb() }), input({ bindingOverride: "DB_B" })), (error: unknown) => error instanceof PhysicalTargetResolutionError && error.code === "PHYSICAL_TARGET_OVERRIDE_FORBIDDEN");
});

test("invalid catalog JSON fails closed", () => {
  assert.throws(() => resolvePhysicalTarget({ PHYSICAL_TARGET_CATALOG_JSON: "{" }, input()), (error: unknown) => error instanceof PhysicalTargetResolutionError && error.code === "PHYSICAL_TARGET_CONFLICT");
});

test("malformed D1 binding fails closed", () => {
  assert.throws(() => resolvePhysicalTarget(env(catalog(), { DB_A: { prepare: () => undefined } }), input()), (error: unknown) => error instanceof PhysicalTargetResolutionError && error.code === "PHYSICAL_TARGET_BINDING_MISSING");
});
