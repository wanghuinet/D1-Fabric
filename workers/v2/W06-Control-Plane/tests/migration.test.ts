import assert from "node:assert/strict";
import test from "node:test";
import { MigrationError, canTransitionMigrationPhase, planMigration, transitionMigrationPhase } from "../src/migration.ts";

const request = {
  logicalDatabaseId: "db-1",
  sourceShardMapVersion: 7,
  targetShardMapVersion: 8,
  controlEpoch: 3,
  logicalShardId: "ls-1",
  sourcePhysicalShardId: "ps-1",
  targetPhysicalShardId: "ps-3",
};

const phases = [
  "PREPARED",
  "COPYING",
  "COPIED",
  "CHECKSUMMING",
  "RECONCILING",
  "VERIFIED",
  "APPROVED",
  "PUBLISHED",
  "CUTOVER",
  "DRAINING",
  "RETIRED",
  "CLEANUP",
] as const;

test("accepts only the declared forward migration phases", () => {
  for (let i = 0; i < phases.length - 1; i += 1) {
    assert.equal(canTransitionMigrationPhase(phases[i], phases[i + 1]), true);
  }
});

test("rejects undeclared transitions and unknown phases", () => {
  for (const [from, to] of [["PREPARED", "VERIFIED"], ["COPYING", "PREPARED"], ["CLEANUP", "RETIRED"]]) {
    assert.throws(
      () => transitionMigrationPhase(from, to),
      (error: unknown) => error instanceof MigrationError && error.code === "ILLEGAL_TRANSITION",
    );
  }
  assert.throws(
    () => canTransitionMigrationPhase("BROKEN", "COPYING"),
    (error: unknown) => error instanceof MigrationError && error.code === "INVALID_PHASE",
  );
});

test("creates deterministic prepared migration", async () => {
  const first = await planMigration(request);
  const second = await planMigration({ ...request });
  assert.deepEqual(first, second);
  assert.equal(first.phase, "PREPARED");
  assert.equal(first.controlEpoch, 3);
  assert.match(first.planId, /^mig-7-8-[0-9a-f]{64}$/);
});

test("rejects invalid or non-advancing shard map versions", async () => {
  await assert.rejects(
    () => planMigration({ ...request, targetShardMapVersion: 7 }),
    (error: unknown) => error instanceof MigrationError && error.code === "INVALID_VERSION",
  );
  await assert.rejects(
    () => planMigration({ ...request, sourceShardMapVersion: 0 }),
    (error: unknown) => error instanceof MigrationError && error.code === "INVALID_VERSION",
  );
  await assert.rejects(
    () => planMigration({ ...request, controlEpoch: 0 }),
    (error: unknown) => error instanceof MigrationError && error.code === "INVALID_VERSION",
  );
});

test("rejects a migration that does not change physical ownership", async () => {
  await assert.rejects(
    () => planMigration({ ...request, targetPhysicalShardId: request.sourcePhysicalShardId }),
    (error: unknown) => error instanceof MigrationError && error.code === "IDENTICAL_SOURCE_AND_TARGET",
  );
});
