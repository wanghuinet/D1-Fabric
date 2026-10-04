import assert from "node:assert/strict";
import test from "node:test";
import { ExpansionError, planExpansion } from "../src/expansion.ts";
import type { MetadataSnapshot } from "../src/metadata.ts";

const sourceSnapshot: MetadataSnapshot = {
  logicalDatabaseId: "db-1",
  shardMapVersion: 7,
  controlEpoch: 3,
  shards: [
    {
      logicalDatabaseId: "db-1",
      logicalShardId: "ls-1",
      physicalShardId: "ps-1",
      shardMapVersion: 7,
      shardStatus: "ACTIVE",
      keySpace: { lowerInclusive: "0000", upperExclusive: "8000" },
      controlEpoch: 3,
      capacityState: "ADMITTED",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      logicalDatabaseId: "db-1",
      logicalShardId: "ls-2",
      physicalShardId: "ps-2",
      shardMapVersion: 7,
      shardStatus: "ACTIVE",
      keySpace: { lowerInclusive: "8000", upperExclusive: "ffff" },
      controlEpoch: 3,
      capacityState: "ADMITTED",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

test("plans deterministic monotonic expansion", async () => {
  const request = {
    sourceSnapshot,
    targetShardMapVersion: 8,
    targetControlEpoch: 3,
    newPhysicalShardIds: ["ps-4", "ps-3"],
  };
  const first = await planExpansion(request);
  const second = await planExpansion({ ...request, newPhysicalShardIds: ["ps-3", "ps-4"] });
  assert.deepEqual(first, second);
  assert.deepEqual(first.existingPhysicalShardIds, ["ps-1", "ps-2"]);
  assert.deepEqual(first.proposedNewPhysicalShardIds, ["ps-3", "ps-4"]);
  assert.deepEqual(first.placementChanges, []);
  assert.deepEqual(first.migrationRequirements, []);
  assert.equal(first.sourceShardMapVersion, 7);
  assert.equal(first.targetShardMapVersion, 8);
  assert.equal(first.sourceControlEpoch, 3);
  assert.equal(first.targetControlEpoch, 3);
  assert.match(first.planId, /^exp-7-8-[0-9a-f]{64}$/);
});

test("rejects invalid versions and missing capacity increase", async () => {
  await assert.rejects(
    () => planExpansion({ sourceSnapshot, targetShardMapVersion: 8, targetControlEpoch: 3, newPhysicalShardIds: [] }),
    (error: unknown) => error instanceof ExpansionError && error.code === "NO_CAPACITY_INCREASE",
  );
  await assert.rejects(
    () => planExpansion({ sourceSnapshot, targetShardMapVersion: 7, targetControlEpoch: 3, newPhysicalShardIds: ["ps-3"] }),
    (error: unknown) => error instanceof ExpansionError && error.code === "INVALID_VERSION",
  );
  await assert.rejects(
    () => planExpansion({ sourceSnapshot, targetShardMapVersion: 8, targetControlEpoch: 2, newPhysicalShardIds: ["ps-3"] }),
    (error: unknown) => error instanceof ExpansionError && error.code === "INVALID_VERSION",
  );
});

test("rejects duplicate or reused physical shard IDs", async () => {
  await assert.rejects(
    () => planExpansion({ sourceSnapshot, targetShardMapVersion: 8, targetControlEpoch: 3, newPhysicalShardIds: ["ps-3", "ps-3"] }),
    (error: unknown) => error instanceof ExpansionError && error.code === "DUPLICATE_NEW_SHARD",
  );
  await assert.rejects(
    () => planExpansion({ sourceSnapshot, targetShardMapVersion: 8, targetControlEpoch: 3, newPhysicalShardIds: ["ps-1"] }),
    (error: unknown) => error instanceof ExpansionError && error.code === "EXISTING_SHARD_REUSED",
  );
});

test("requires every ownership change to target newly added capacity", async () => {
  const plan = await planExpansion({
    sourceSnapshot,
    targetShardMapVersion: 8,
    targetControlEpoch: 3,
    newPhysicalShardIds: ["ps-3"],
    placementChanges: [
      { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-3" },
    ],
  });
  assert.deepEqual(plan.placementChanges, [
    { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-3" },
  ]);
  assert.deepEqual(plan.migrationRequirements, [
    { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-3" },
  ]);

  await assert.rejects(
    () => planExpansion({
      sourceSnapshot,
      targetShardMapVersion: 8,
      targetControlEpoch: 3,
      newPhysicalShardIds: ["ps-3"],
      placementChanges: [
        { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-2" },
      ],
    }),
    (error: unknown) => error instanceof ExpansionError && error.code === "INVALID_PLACEMENT_CHANGE",
  );
});
