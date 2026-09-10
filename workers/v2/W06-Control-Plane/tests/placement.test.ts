import assert from "node:assert/strict";
import test from "node:test";
import { PlacementError, resolvePlacement, type ShardMetadata } from "../src/placement.ts";

const metadata: readonly ShardMetadata[] = [
  { logicalDatabaseId: "db-1", logicalShardId: "ls-7", physicalShardId: "ps-3", topologyVersion: 4, lifecycle: "ACTIVE", capacityState: "ADMITTED" },
];

test("resolves one active placement deterministically", () => {
  const request = { logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 };
  const first = resolvePlacement(request, metadata);
  const second = resolvePlacement(request, metadata);
  assert.deepEqual(first, second);
  assert.equal(first.physicalShardId, "ps-3");
});

test("fails closed when logical shard metadata is missing", () => {
  assert.throws(
    () => resolvePlacement({ logicalDatabaseId: "db-1", logicalShardId: "missing", topologyVersion: 4 }, metadata),
    (error: unknown) => error instanceof PlacementError && error.code === "MISSING_PLACEMENT",
  );
});

test("rejects a stale topology version instead of upgrading silently", () => {
  assert.throws(
    () => resolvePlacement({ logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 3 }, metadata),
    (error: unknown) => error instanceof PlacementError && error.code === "STALE_VERSION",
  );
});

test("rejects duplicate active ownership in one topology version", () => {
  assert.throws(
    () => resolvePlacement(
      { logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 },
      [
        ...metadata,
        { logicalDatabaseId: "db-1", logicalShardId: "ls-7", physicalShardId: "ps-4", topologyVersion: 4, lifecycle: "ACTIVE", capacityState: "ADMITTED" },
      ],
    ),
    (error: unknown) => error instanceof PlacementError && error.code === "AMBIGUOUS_PLACEMENT",
  );
});

test("does not place onto non-active lifecycle state", () => {
  assert.throws(
    () => resolvePlacement(
      { logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 },
      [{ ...metadata[0], lifecycle: "DRAINING" }],
    ),
    (error: unknown) => error instanceof PlacementError && error.code === "AMBIGUOUS_PLACEMENT",
  );
});

test("does not place onto a capacity-blocked active shard", () => {
  assert.throws(
    () => resolvePlacement(
      { logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 },
      [{ ...metadata[0], capacityState: "BLOCKED" }],
    ),
    (error: unknown) => error instanceof PlacementError && error.code === "CAPACITY_BLOCKED",
  );
});

test("rejects malformed request and metadata identifiers", () => {
  assert.throws(
    () => resolvePlacement({ logicalDatabaseId: "", logicalShardId: "ls-7", topologyVersion: 4 }, metadata),
    (error: unknown) => error instanceof PlacementError && error.code === "INVALID_REQUEST",
  );
  assert.throws(
    () => resolvePlacement(
      { logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 },
      [{ ...metadata[0], physicalShardId: "" }],
    ),
    (error: unknown) => error instanceof PlacementError && error.code === "INVALID_METADATA",
  );
  assert.throws(
    () => resolvePlacement(
      { logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 },
      [{ ...metadata[0], capacityState: "UNKNOWN" as never }],
    ),
    (error: unknown) => error instanceof PlacementError && error.code === "INVALID_METADATA",
  );
});
