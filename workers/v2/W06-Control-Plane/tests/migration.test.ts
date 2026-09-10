import assert from "node:assert/strict";
import test from "node:test";
import {
  MigrationError,
  canTransitionMigrationPhase,
  planMigration,
  transitionMigrationPhase,
} from "../src/migration.ts";

const request = {
  logicalDatabaseId: "db-1",
  sourceTopologyVersion: 7,
  targetTopologyVersion: 8,
  logicalShardId: "ls-1",
  sourcePhysicalShardId: "ps-1",
  targetPhysicalShardId: "ps-3",
};

test("accepts only the declared forward migration phases", () => {
  assert.equal(canTransitionMigrationPhase("PLANNED", "COPYING"), true);
  assert.equal(canTransitionMigrationPhase("COPYING", "VERIFYING"), true);
  assert.equal(canTransitionMigrationPhase("VERIFYING", "CUTOVER_READY"), true);
  assert.equal(canTransitionMigrationPhase("CUTOVER_READY", "CUTOVER"), true);
  assert.equal(canTransitionMigrationPhase("CUTOVER", "COMPLETE"), true);
});

test("rejects failure or rollback by refusing undeclared transitions", () => {
  const invalidTransitions = [
    ["PLANNED", "VERIFYING"],
    ["COPYING", "PLANNED"],
    ["VERIFYING", "COPYING"],
    ["CUTOVER", "VERIFYING"],
    ["COMPLETE", "CUTOVER"],
  ];
  for (const [from, to] of invalidTransitions) {
    assert.throws(
      () => transitionMigrationPhase(from, to),
      (error: unknown) => error instanceof MigrationError && error.code === "ILLEGAL_TRANSITION",
    );
  }
});

test("rejects unknown migration phases", () => {
  assert.throws(
    () => canTransitionMigrationPhase("BROKEN", "COPYING"),
    (error: unknown) => error instanceof MigrationError && error.code === "INVALID_PHASE",
  );
});

test("creates deterministic planned migration", async () => {
  const first = await planMigration(request);
  const second = await planMigration({ ...request });
  assert.deepEqual(first, second);
  assert.equal(first.phase, "PLANNED");
  assert.match(first.planId, /^mig-7-8-[0-9a-f]{64}$/);
});

test("rejects invalid or non-advancing topology versions", async () => {
  await assert.rejects(
    () => planMigration({ ...request, targetTopologyVersion: 7 }),
    (error: unknown) => error instanceof MigrationError && error.code === "INVALID_VERSION",
  );
  await assert.rejects(
    () => planMigration({ ...request, sourceTopologyVersion: 0 }),
    (error: unknown) => error instanceof MigrationError && error.code === "INVALID_VERSION",
  );
});

test("rejects a migration that does not change physical ownership", async () => {
  await assert.rejects(
    () => planMigration({ ...request, targetPhysicalShardId: request.sourcePhysicalShardId }),
    (error: unknown) => error instanceof MigrationError && error.code === "IDENTICAL_SOURCE_AND_TARGET",
  );
});
