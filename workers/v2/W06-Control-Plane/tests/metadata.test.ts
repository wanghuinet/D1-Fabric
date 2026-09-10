import assert from "node:assert/strict";
import test from "node:test";
import { MetadataError, MetadataRegistry, type MetadataSnapshot } from "../src/metadata.ts";

const snapshot = (overrides: Partial<MetadataSnapshot> = {}): MetadataSnapshot => ({
  logicalDatabaseId: "db-1",
  topologyVersion: 7,
  shards: [
    {
      logicalDatabaseId: "db-1",
      physicalShardId: "ps-1",
      topologyVersion: 7,
      lifecycle: "ACTIVE",
      capacityState: "ADMITTED",
      creationTimestamp: 100,
      lastTransitionTimestamp: 100,
    },
    {
      logicalDatabaseId: "db-1",
      physicalShardId: "ps-2",
      topologyVersion: 7,
      lifecycle: "PROVISIONING",
      capacityState: "BLOCKED",
      creationTimestamp: 110,
      lastTransitionTimestamp: 110,
    },
  ],
  ...overrides,
});

test("publishes and reads one exact metadata version deterministically", () => {
  const registry = new MetadataRegistry();
  const input = snapshot();
  registry.publish(input);
  const first = registry.read("db-1", 7);
  const second = registry.read("db-1", 7);
  assert.deepEqual(first, second);
  assert.equal(first.topologyVersion, 7);
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
    () =>
      registry.publish(
        snapshot({
          shards: [
            {
              ...snapshot().shards[0],
              topologyVersion: 6,
            },
          ],
        }),
      ),
    (error: unknown) => error instanceof MetadataError && error.code === "INVALID_SHARD_METADATA",
  );
});

test("rejects duplicate physical ownership", () => {
  const registry = new MetadataRegistry();
  assert.throws(
    () =>
      registry.publish(
        snapshot({
          shards: [
            snapshot().shards[0],
            { ...snapshot().shards[1], physicalShardId: "ps-1" },
          ],
        }),
      ),
    (error: unknown) => error instanceof MetadataError && error.code === "DUPLICATE_PHYSICAL_SHARD",
  );
});

test("rejects metadata from another logical database", () => {
  const registry = new MetadataRegistry();
  assert.throws(
    () =>
      registry.publish(
        snapshot({
          shards: [{ ...snapshot().shards[0], logicalDatabaseId: "db-2" }],
        }),
      ),
    (error: unknown) => error instanceof MetadataError && error.code === "INVALID_SHARD_METADATA",
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
