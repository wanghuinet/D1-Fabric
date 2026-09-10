import assert from "node:assert/strict";
import test from "node:test";
import { ExpansionError, planExpansion } from "../src/expansion.ts";
import type { MetadataSnapshot } from "../src/metadata.ts";

const sourceSnapshot: MetadataSnapshot = {
  logicalDatabaseId: "db-1",
  topologyVersion: 7,
  shards: [
    {
      logicalDatabaseId: "db-1",
      logicalShardId: "ls-1",
      physicalShardId: "ps-1",
      topologyVersion: 7,
      lifecycle: "ACTIVE",
      capacityState: "ADMITTED",
      creationTimestamp: 100,
      lastTransitionTimestamp: 100,
    },
    {
      logicalDatabaseId: "db-1",
      logicalShardId: "ls-2",
      physicalShardId: "ps-2",
      topologyVersion: 7,
      lifecycle: "ACTIVE",
      capacityState: "ADMITTED",
      creationTimestamp: 100,
      lastTransitionTimestamp: 100,
    },
  ],
};

test("plans deterministic monotonic expansion", async () => {
  const request = {
    sourceSnapshot,
    targetTopologyVersion: 8,
    newPhysicalShardIds: ["ps-4", "ps-3"],
  };
  const first = await planExpansion(request);
  const second = await planExpansion({ ...request, newPhysicalShardIds: ["ps-3", "ps-4"] });
  assert.deepEqual(first, second);
  assert.deepEqual(first.existingPhysicalShardIds, ["ps-1", "ps-2"]);
  assert.deepEqual(first.proposedNewPhysicalShardIds, ["ps-3", "ps-4"]);
  assert.deepEqual(first.placementChanges, []);
  assert.deepEqual(first.migrationRequirements, []);
  assert.equal(first.sourceTopologyVersion, 7);
  assert.equal(first.targetTopologyVersion, 8);
  assert.match(first.planId, /^exp-7-8-[0-9a-f]{64}$/);
});

test("rejects implicit topology shrink", async () => {
  await assert.rejects(
    () => planExpansion({ sourceSnapshot, targetTopologyVersion: 8, newPhysicalShardIds: [] }),
    (error: unknown) => error instanceof ExpansionError && error.code === "NO_CAPACITY_INCREASE",
  );
  await assert.rejects(
    () => planExpansion({ sourceSnapshot, targetTopologyVersion: 7, newPhysicalShardIds: ["ps-3"] }),
    (error: unknown) => error instanceof ExpansionError && error.code === "INVALID_VERSION",
  );
});

test("rejects duplicate or reused physical shard IDs", async () => {
  await assert.rejects(
    () => planExpansion({ sourceSnapshot, targetTopologyVersion: 8, newPhysicalShardIds: ["ps-3", "ps-3"] }),
    (error: unknown) => error instanceof ExpansionError && error.code === "DUPLICATE_NEW_SHARD",
  );
  await assert.rejects(
    () => planExpansion({ sourceSnapshot, targetTopologyVersion: 8, newPhysicalShardIds: ["ps-1"] }),
    (error: unknown) => error instanceof ExpansionError && error.code === "EXISTING_SHARD_REUSED",
  );
});

test("requires every ownership change to be explicit and target newly added capacity", async () => {
  const plan = await planExpansion({
    sourceSnapshot,
    targetTopologyVersion: 8,
    newPhysicalShardIds: ["ps-3"],
    placementChanges: [
      {
        logicalShardId: "ls-1",
        sourcePhysicalShardId: "ps-1",
        targetPhysicalShardId: "ps-3",
      },
    ],
  });
  assert.deepEqual(plan.placementChanges, [
    { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-3" },
  ]);
  assert.deepEqual(plan.migrationRequirements, [
    { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-3" },
  ]);

  await assert.rejects(
    () =>
      planExpansion({
        sourceSnapshot,
        targetTopologyVersion: 8,
        newPhysicalShardIds: ["ps-3"],
        placementChanges: [
          { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-2" },
        ],
      }),
    (error: unknown) => error instanceof ExpansionError && error.code === "INVALID_PLACEMENT_CHANGE",
  );
});

test("rejects ambiguous or unknown placement ownership", async () => {
  const invalid = [
    { logicalShardId: "missing", sourcePhysicalShardId: "ps-1", targetPhysicalShardId: "ps-3" },
    { logicalShardId: "ls-1", sourcePhysicalShardId: "ps-2", targetPhysicalShardId: "ps-3" },
  ];
  for (const placementChange of invalid) {
    await assert.rejects(
      () => planExpansion({ sourceSnapshot, targetTopologyVersion: 8, newPhysicalShardIds: ["ps-3"], placementChanges: [placementChange] }),
      (error: unknown) => error instanceof ExpansionError && error.code === "INVALID_PLACEMENT_CHANGE",
    );
  }
});
