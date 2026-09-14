import assert from "node:assert/strict";
import test from "node:test";
import { PlacementError, resolvePlacement, type ShardMetadata } from "../src/placement.ts";

const metadata: readonly ShardMetadata[] = [
  {
    logicalDatabaseId: "db-1",
    logicalShardId: "ls-7",
    physicalShardId: "ps-3",
    shardMapVersion: 4,
    shardStatus: "ACTIVE",
    keySpace: { lowerInclusive: "0000", upperExclusive: "ffff" },
    controlEpoch: 9,
    capacityState: "ADMITTED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const request = { logicalDatabaseId: "db-1", logicalShardKey: "abcd", shardMapVersion: 4 };

test("resolves one active placement deterministically", () => {
  const first = resolvePlacement(request, metadata);
  const second = resolvePlacement(request, metadata);
  assert.deepEqual(first, second);
  assert.equal(first.physicalShardId, "ps-3");
  assert.equal(first.shardMapVersion, 4);
  assert.equal(first.controlEpoch, 9);
});

test("fails closed when the requested shard key is uncovered", () => {
  assert.throws(
    () => resolvePlacement({ ...request, logicalShardKey: "zzzz" }, metadata),
    (error: unknown) => error instanceof PlacementError && error.code === "MISSING_PLACEMENT",
  );
});

test("rejects a stale shard map version instead of upgrading silently", () => {
  assert.throws(
    () => resolvePlacement({ ...request, shardMapVersion: 3 }, metadata),
    (error: unknown) => error instanceof PlacementError && error.code === "STALE_VERSION",
  );
});

test("rejects overlapping active keyspaces", () => {
  assert.throws(
    () => resolvePlacement(
      request,
      [
        ...metadata,
        { ...metadata[0], logicalShardId: "ls-8", physicalShardId: "ps-4", keySpace: { lowerInclusive: "8000", upperExclusive: "ffff" } },
      ],
    ),
    (error: unknown) => error instanceof PlacementError && error.code === "AMBIGUOUS_PLACEMENT",
  );
});

test("does not place onto a non-active lifecycle state", () => {
  assert.throws(
    () => resolvePlacement(request, [{ ...metadata[0], shardStatus: "DRAINING" }]),
    (error: unknown) => error instanceof PlacementError && error.code === "MISSING_PLACEMENT",
  );
});

test("does not place onto a capacity-blocked active shard", () => {
  assert.throws(
    () => resolvePlacement(request, [{ ...metadata[0], capacityState: "BLOCKED" }]),
    (error: unknown) => error instanceof PlacementError && error.code === "CAPACITY_BLOCKED",
  );
});

test("rejects malformed request and metadata", () => {
  assert.throws(
    () => resolvePlacement({ ...request, logicalDatabaseId: "" }, metadata),
    (error: unknown) => error instanceof PlacementError && error.code === "INVALID_REQUEST",
  );
  assert.throws(
    () => resolvePlacement(request, [{ ...metadata[0], keySpace: { lowerInclusive: "ffff", upperExclusive: "0000" } }]),
    (error: unknown) => error instanceof PlacementError && error.code === "INVALID_METADATA",
  );
  assert.throws(
    () => resolvePlacement(request, [{ ...metadata[0], controlEpoch: 0 }]),
    (error: unknown) => error instanceof PlacementError && error.code === "INVALID_METADATA",
  );
});
