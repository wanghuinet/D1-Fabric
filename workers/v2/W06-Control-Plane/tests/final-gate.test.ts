import assert from "node:assert/strict";
import test from "node:test";
import { planExpansion } from "../src/expansion.ts";
import { MetadataRegistry, type MetadataSnapshot } from "../src/metadata.ts";
import { planMigration, transitionMigrationPhase } from "../src/migration.ts";
import { resolvePlacement } from "../src/placement.ts";
import { planRebalance } from "../src/rebalance.ts";

function snapshot(logicalDatabaseId: string, shardMapVersion: number, controlEpoch: number): MetadataSnapshot {
  return {
    logicalDatabaseId,
    shardMapVersion,
    controlEpoch,
    shards: [
      {
        logicalDatabaseId,
        logicalShardId: "ls-0",
        physicalShardId: "ps-0",
        shardMapVersion,
        shardStatus: "ACTIVE",
        keySpace: { lowerInclusive: "0000", upperExclusive: "8000" },
        controlEpoch,
        capacityState: "ADMITTED",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        logicalDatabaseId,
        logicalShardId: "ls-1",
        physicalShardId: "ps-1",
        shardMapVersion,
        shardStatus: "ACTIVE",
        keySpace: { lowerInclusive: "8000", upperExclusive: "ffff" },
        controlEpoch,
        capacityState: "ADMITTED",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}

test("final gate: one published version is the authoritative placement source", () => {
  const registry = new MetadataRegistry();
  const input = snapshot("db-gate", 7, 3);
  registry.publish(input);
  const published = registry.read("db-gate", 7);
  const placement = resolvePlacement(
    { logicalDatabaseId: "db-gate", logicalShardKey: "fffe", shardMapVersion: 7 },
    published.shards,
  );
  assert.equal(placement.physicalShardId, "ps-1");
  assert.equal(placement.shardMapVersion, 7);
  assert.equal(placement.controlEpoch, 3);
  assert.throws(() => registry.read("db-gate", 6));
});

test("final gate: expansion only increases capacity and derives explicit migration work", async () => {
  const sourceSnapshot = snapshot("db-exp", 10, 3);
  const request = {
    sourceSnapshot,
    targetShardMapVersion: 11,
    targetControlEpoch: 3,
    newPhysicalShardIds: ["ps-2", "ps-3"],
    placementChanges: [
      { logicalShardId: "ls-0", sourcePhysicalShardId: "ps-0", targetPhysicalShardId: "ps-2" },
    ],
  };
  const first = await planExpansion(request);
  const second = await planExpansion(request);
  assert.equal(first.planId, second.planId);
  assert.deepEqual(first.migrationRequirements, [{
    logicalShardId: "ls-0",
    sourcePhysicalShardId: "ps-0",
    targetPhysicalShardId: "ps-2",
  }]);
  assert.notEqual(first.sourceShardMapVersion, first.targetShardMapVersion);
});

test("final gate: migration remains the explicit v1.1 state machine", async () => {
  const plan = await planMigration({
    logicalDatabaseId: "db-mig",
    logicalShardId: "ls-0",
    sourcePhysicalShardId: "ps-0",
    targetPhysicalShardId: "ps-1",
    sourceShardMapVersion: 20,
    targetShardMapVersion: 21,
    controlEpoch: 5,
  });
  const phases = [
    "PREPARED", "COPYING", "COPIED", "CHECKSUMMING", "RECONCILING", "VERIFIED",
    "APPROVED", "PUBLISHED", "CUTOVER", "DRAINING", "RETIRED", "CLEANUP",
  ] as const;
  let current = plan.phase;
  for (const next of phases.slice(1)) current = transitionMigrationPhase(current, next);
  assert.equal(current, "CLEANUP");
});

test("final gate: rebalance exposes only explicit ownership changes", async () => {
  const plan = await planRebalance({
    sourceSnapshot: snapshot("db-reb", 30, 6),
    targetShardMapVersion: 31,
    controlEpoch: 6,
    assignments: [
      { logicalShardId: "ls-0", sourcePhysicalShardId: "ps-0", targetPhysicalShardId: "ps-1" },
      { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-0" },
    ],
  });
  assert.equal(plan.ownershipChanges.length, 2);
  assert.deepEqual(plan.ownershipChanges, plan.assignments);
  assert.ok(plan.planId.startsWith("reb-30-31-"));
});
