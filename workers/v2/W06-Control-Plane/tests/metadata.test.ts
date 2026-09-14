import assert from "node:assert/strict";
import test from "node:test";
import { MetadataError, MetadataRegistry, type MetadataSnapshot } from "../src/metadata.ts";

const snapshot = (overrides: Partial<MetadataSnapshot> = {}): MetadataSnapshot => ({
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
      shardStatus: "REGISTERED",
      keySpace: { lowerInclusive: "8000", upperExclusive: "ffff" },
      controlEpoch: 3,
      capacityState: "BLOCKED",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  ...overrides,
});

test("publishes and reads one exact shard map version deterministically", () => {
  const registry = new MetadataRegistry();
  const input = snapshot();
  registry.publish(input);
  const first = registry.read("db-1", 7);
  const second = registry.read("db-1", 7);
  assert.deepEqual(first, second);
  assert.equal(first.shardMapVersion, 7);
  assert.equal(first.controlEpoch, 3);
});

test("published metadata is immutable", () => {
  const registry = new MetadataRegistry();
  registry.publish(snapshot());
  assert.throws(
    () => registry.publish(snapshot()),
    (error: unknown) => error instanceof MetadataError && error.code === "IMMUTABLE_VERSION",
  );
});

test("rejects partial metadata with a version mismatch", () => {
  const registry = new MetadataRegistry();
  assert.throws(
    () => registry.publish(snapshot({ shards: [{ ...snapshot().shards[0], shardMapVersion: 6 }] })),
    (error: unknown) => error instanceof MetadataError && error.code === "INVALID_SHARD_METADATA",
  );
});

test("rejects metadata with a control epoch mismatch", () => {
  const registry = new MetadataRegistry();
  assert.throws(
    () => registry.publish(snapshot({ shards: [{ ...snapshot().shards[0], controlEpoch: 4 }] })),
    (error: unknown) => error instanceof MetadataError && error.code === "INVALID_SHARD_METADATA",
  );
});

test("rejects duplicate physical ownership", () => {
  const registry = new MetadataRegistry();
  assert.throws(
    () => registry.publish(snapshot({ shards: [snapshot().shards[0], { ...snapshot().shards[1], physicalShardId: "ps-1" }] })),
    (error: unknown) => error instanceof MetadataError && error.code === "DUPLICATE_PHYSICAL_SHARD",
  );
});

test("rejects duplicate logical ownership", () => {
  const registry = new MetadataRegistry();
  assert.throws(
    () => registry.publish(snapshot({ shards: [snapshot().shards[0], { ...snapshot().shards[1], logicalShardId: "ls-1" }] })),
    (error: unknown) => error instanceof MetadataError && error.code === "DUPLICATE_LOGICAL_SHARD",
  );
});

test("rejects metadata from another logical database", () => {
  const registry = new MetadataRegistry();
  assert.throws(
    () => registry.publish(snapshot({ shards: [{ ...snapshot().shards[0], logicalDatabaseId: "db-2" }] })),
    (error: unknown) => error instanceof MetadataError && error.code === "INVALID_SHARD_METADATA",
  );
});

test("rejects keyspace gaps", () => {
  const registry = new MetadataRegistry();
  assert.throws(
    () => registry.publish(snapshot({ shards: [{ ...snapshot().shards[0], keySpace: { lowerInclusive: "0000", upperExclusive: "7000" } }, { ...snapshot().shards[1], keySpace: { lowerInclusive: "8000", upperExclusive: "ffff" } }] })),
    (error: unknown) => error instanceof MetadataError && error.code === "INVALID_KEYSPACE_COVERAGE",
  );
});

test("does not silently upgrade a missing or different version", () => {
  const registry = new MetadataRegistry();
  registry.publish(snapshot());
  assert.throws(
    () => registry.read("db-1", 6),
    (error: unknown) => error instanceof MetadataError && error.code === "MISSING_VERSION",
  );
  assert.throws(
    () => registry.read("db-2", 7),
    (error: unknown) => error instanceof MetadataError && error.code === "MISSING_VERSION",
  );
});
