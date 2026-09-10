import assert from "node:assert/strict";
import test from "node:test";
import { planExpansion } from "../src/expansion.ts";
import { MetadataRegistry, type MetadataSnapshot } from "../src/metadata.ts";
import { planMigration, transitionMigrationPhase } from "../src/migration.ts";
import { resolvePlacement } from "../src/placement.ts";
import { planRebalance } from "../src/rebalance.ts";

test("final gate: one published version is the authoritative placement source", () => {
  const registry = new MetadataRegistry();
  const snapshot: MetadataSnapshot = {
    logicalDatabaseId: "db-gate",
    topologyVersion: 7,
    shards: [
      {
        logicalDatabaseId: "db-gate",
        logicalShardId: "ls-0",
        physicalShardId: "ps-0",
        topologyVersion: 7,
        lifecycle: "ACTIVE",
        capacityState: "ADMITTED",
        creationTimestamp: 1,
        lastTransitionTimestamp: 1,
      },
      {
        logicalDatabaseId: "db-gate",
        logicalShardId: "ls-1",
        physicalShardId: "ps-1",
        topologyVersion: 7,
        lifecycle: "ACTIVE",
        capacityState: "ADMITTED",
        creationTimestamp: 1,
        lastTransitionTimestamp: 1,
      },
    ],
  };
  registry.publish(snapshot);
  const published = registry.read("db-gate", 7);
  assert.deepEqual(resolvePlacement(
    { logicalDatabaseId: "db-gate", logicalShardId: "ls-1", topologyVersion: 7 },
    published.shards.map((shard) => ({
      logicalDatabaseId: shard.logicalDatabaseId,
      logicalShardId: shard.logicalShardId,
      physicalShardId: shard.physicalShardId,
      topologyVersion: shard.topologyVersion,
      lifecycle: shard.lifecycle,
    })),
  ), {
    logicalDatabaseId: "db-gate",
    logicalShardId: "ls-1",
    physicalShardId: "ps-1",
    topologyVersion: 7,
  });

  assert.throws(() => registry.read("db-gate", 6));
});

test("final gate: expansion only increases capacity and derives explicit migration work", async () => {
  const sourceSnapshot: MetadataSnapshot = {
    logicalDatabaseId: "db-exp",
    topologyVersion: 10,
    shards: [
      {
        logicalDatabaseId: "db-exp",
        logicalShardId: "ls-0",
        physicalShardId: "ps-0",
        topologyVersion: 10,
        lifecycle: "ACTIVE",
        capacityState: "ADMITTED",
        creationTimestamp: 1,
        lastTransitionTimestamp: 1,
      },
      {
        logicalDatabaseId: "db-exp",
        logicalShardId: "ls-1",
        physicalShardId: "ps-1",
        topologyVersion: 10,
        lifecycle: "ACTIVE",
        capacityState: "ADMITTED",
        creationTimestamp: 1,
        lastTransitionTimestamp: 1,
      },
    ],
  };

  const request = {
    sourceSnapshot,
    targetTopologyVersion: 11,
    newPhysicalShardIds: ["ps-2", "ps-3"],
    placementChanges: [
      {
        logicalShardId: "ls-0",
        sourcePhysicalShardId: "ps-0",
        targetPhysicalShardId: "ps-2",
      },
    ],
  };
  const first = await planExpansion(request);
  const second = await planExpansion(request);
  assert.equal(first.planId, second.planId);
  assert.deepEqual(first.existingPhysicalShardIds, ["ps-0", "ps-1"]);
  assert.deepEqual(first.proposedNewPhysicalShardIds, ["ps-2", "ps-3"]);
  assert.deepEqual(first.migrationRequirements, [
    {
      logicalShardId: "ls-0",
      sourcePhysicalShardId: "ps-0",
      targetPhysicalShardId: "ps-2",
    },
  ]);
  assert.notEqual(first.sourceTopologyVersion, first.targetTopologyVersion);
});

test("final gate: migration remains an explicit state machine", async () => {
  const plan = await planMigration({
    logicalDatabaseId: "db-mig",
    logicalShardId: "ls-0",
    sourcePhysicalShardId: "ps-0",
    targetPhysicalShardId: "ps-1",
    sourceTopologyVersion: 20,
    targetTopologyVersion: 21,
  });
  const phases = [
    "PLANNED",
    "COPYING",
    "VERIFYING",
    "CUTOVER_READY",
    "CUTOVER",
    "COMPLETE",
  ] as const;
  let current = plan.phase;
  for (const next of phases.slice(1)) {
    current = transitionMigrationPhase(current, next);
  }
  assert.equal(current, "COMPLETE");
});

test("final gate: rebalance exposes only explicit ownership changes", async () => {
  const snapshot: MetadataSnapshot = {
    logicalDatabaseId: "db-reb",
    topologyVersion: 30,
    shards: [
      {
        logicalDatabaseId: "db-reb",
        logicalShardId: "ls-0",
        physicalShardId: "ps-0",
        topologyVersion: 30,
        lifecycle: "ACTIVE",
        capacityState: "ADMITTED",
        creationTimestamp: 1,
        lastTransitionTimestamp: 1,
      },
      {
        logicalDatabaseId: "db-reb",
        logicalShardId: "ls-1",
        physicalShardId: "ps-1",
        topologyVersion: 30,
        lifecycle: "ACTIVE",
        capacityState: "ADMITTED",
        creationTimestamp: 1,
        lastTransitionTimestamp: 1,
      },
    ],
  };

  const plan = await planRebalance({
    sourceSnapshot: snapshot,
    targetTopologyVersion: 31,
    assignments: [
      { logicalShardId: "ls-0", sourcePhysicalShardId: "ps-0", targetPhysicalShardId: "ps-1" },
      { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-0" },
    ],
  });

  assert.equal(plan.ownershipChanges.length, 2);
  assert.deepEqual(plan.ownershipChanges, plan.assignments);
  assert.equal(typeof plan.planId, "string");
  assert.ok(plan.planId.startsWith("reb-30-31-"));
});
