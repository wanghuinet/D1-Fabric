import assert from "node:assert/strict";
import test from "node:test";
import { RebalanceError, planRebalance } from "../src/rebalance.ts";
import type { MetadataSnapshot } from "../src/metadata.ts";

const sourceSnapshot: MetadataSnapshot = {
  logicalDatabaseId: "db-1",
  topologyVersion: 8,
  shards: [
    { logicalDatabaseId: "db-1", logicalShardId: "ls-1", physicalShardId: "ps-1", topologyVersion: 8, lifecycle: "ACTIVE", capacityState: "ADMITTED", creationTimestamp: 100, lastTransitionTimestamp: 100 },
    { logicalDatabaseId: "db-1", logicalShardId: "ls-2", physicalShardId: "ps-2", topologyVersion: 8, lifecycle: "ACTIVE", capacityState: "ADMITTED", creationTimestamp: 100, lastTransitionTimestamp: 100 },
    { logicalDatabaseId: "db-1", logicalShardId: "ls-3", physicalShardId: "ps-3", topologyVersion: 8, lifecycle: "ACTIVE", capacityState: "ADMITTED", creationTimestamp: 100, lastTransitionTimestamp: 100 },
  ],
};

const assignments = [
  { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-2" },
  { logicalShardId: "ls-2", sourcePhysicalShardId: "ps-2", targetPhysicalShardId: "ps-3" },
  { logicalShardId: "ls-3", sourcePhysicalShardId: "ps-3", targetPhysicalShardId: "ps-1" },
];

test("produces deterministic complete rebalance plan", async () => {
  const first = await planRebalance({ sourceSnapshot, targetTopologyVersion: 9, assignments });
  const second = await planRebalance({ sourceSnapshot, targetTopologyVersion: 9, assignments: [...assignments].reverse() });
  assert.deepEqual(first, second);
  assert.equal(first.ownershipChanges.length, 3);
  assert.match(first.planId, /^reb-8-9-[0-9a-f]{64}$/);
});

test("rejects incomplete coverage and non-advancing versions", async () => {
  await assert.rejects(
    () => planRebalance({ sourceSnapshot, targetTopologyVersion: 9, assignments: assignments.slice(0, 2) }),
    (error: unknown) => error instanceof RebalanceError && error.code === "INCOMPLETE_COVERAGE",
  );
  await assert.rejects(
    () => planRebalance({ sourceSnapshot, targetTopologyVersion: 8, assignments }),
    (error: unknown) => error instanceof RebalanceError && error.code === "INVALID_VERSION",
  );
});

test("rejects duplicate logical ownership and duplicate physical targets", async () => {
  await assert.rejects(
    () => planRebalance({ sourceSnapshot, targetTopologyVersion: 9, assignments: [assignments[0], assignments[0], assignments[2]] }),
    (error: unknown) => error instanceof RebalanceError && error.code === "DUPLICATE_LOGICAL_SHARD",
  );
  await assert.rejects(
    () => planRebalance({ sourceSnapshot, targetTopologyVersion: 9, assignments: [
      assignments[0],
      { ...assignments[1], targetPhysicalShardId: "ps-2" },
      assignments[2],
    ] }),
    (error: unknown) => error instanceof RebalanceError && error.code === "DUPLICATE_TARGET_OWNERSHIP",
  );
});

test("rejects unknown, mismatched, or non-active ownership", async () => {
  await assert.rejects(
    () => planRebalance({ sourceSnapshot, targetTopologyVersion: 9, assignments: [
      { ...assignments[0], logicalShardId: "missing" }, assignments[1], assignments[2],
    ] }),
    (error: unknown) => error instanceof RebalanceError && error.code === "UNKNOWN_LOGICAL_SHARD",
  );
  await assert.rejects(
    () => planRebalance({ sourceSnapshot, targetTopologyVersion: 9, assignments: [
      { ...assignments[0], sourcePhysicalShardId: "ps-3" }, assignments[1], assignments[2],
    ] }),
    (error: unknown) => error instanceof RebalanceError && error.code === "SOURCE_MISMATCH",
  );
  const drainingSnapshot = { ...sourceSnapshot, shards: sourceSnapshot.shards.map((shard) => shard.logicalShardId === "ls-2" ? { ...shard, lifecycle: "DRAINING" as const } : shard) };
  await assert.rejects(
    () => planRebalance({ sourceSnapshot: drainingSnapshot, targetTopologyVersion: 9, assignments }),
    (error: unknown) => error instanceof RebalanceError && error.code === "NON_ACTIVE_TARGET",
  );
});

test("does not perform hidden data movement", async () => {
  const plan = await planRebalance({
    sourceSnapshot,
    targetTopologyVersion: 9,
    assignments: sourceSnapshot.shards.map((shard) => ({
      logicalShardId: shard.logicalShardId,
      sourcePhysicalShardId: shard.physicalShardId,
      targetPhysicalShardId: shard.physicalShardId,
    })),
  });
  assert.deepEqual(plan.ownershipChanges, []);
  assert.deepEqual(plan.assignments, sourceSnapshot.shards.map((shard) => ({
    logicalShardId: shard.logicalShardId,
    sourcePhysicalShardId: shard.physicalShardId,
    targetPhysicalShardId: shard.physicalShardId,
  })));
});
