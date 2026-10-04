import assert from "node:assert/strict";
import test from "node:test";
import { D1AuthoritativeMetadataStore, ShardMapPublicationConflictError, ShardMapVersionNotPublishedError } from "../src/authoritative-store.ts";
import type { MetadataSnapshot } from "../src/metadata.ts";

class FakeStatement {
  private values: unknown[] = [];
  private readonly rows: Record<string, unknown>[];
  private readonly changes: number;

  constructor(rows: Record<string, unknown>[], changes = 1) {
    this.rows = rows;
    this.changes = changes;
  }

  bind(...values: unknown[]): FakeStatement {
    this.values = values;
    return this;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    if (this.rows.length === 1 && "shard_map_version" in this.rows[0] && "control_epoch" in this.rows[0] && Object.keys(this.rows[0]).length === 2) {
      assert.deepEqual(this.values, ["db-1"]);
    } else {
      assert.deepEqual(this.values, ["db-1", 4]);
    }
    return { results: this.rows as T[] };
  }

  async run(): Promise<{ success: boolean; meta: { changes: number } }> {
    return { success: true, meta: { changes: this.changes } };
  }
}

class FakeDb {
  batchCalls: number[] = [];
  prepare(sql: string): FakeStatement {
    if (sql.includes("FROM d1f_w06_shard_map_head")) {
      return new FakeStatement([{ shard_map_version: 4, control_epoch: 9 }]);
    }
    return new FakeStatement([{
      logical_database_id: "db-1",
      logical_shard_id: "ls-7",
      physical_shard_id: "ps-3",
      shard_map_version: 4,
      shard_status: "ACTIVE",
      keyspace_lower_inclusive: "0000",
      keyspace_upper_exclusive: "ffff",
      control_epoch: 9,
      capacity_state: "ADMITTED",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    }]);
  }
  async batch(statements: FakeStatement[]): Promise<Array<{ success: boolean; meta?: { changes?: number } }>> {
    this.batchCalls.push(statements.length);
    return statements.map(() => ({ success: true, meta: { changes: 1 } }));
  }
}

const snapshot: MetadataSnapshot = {
  logicalDatabaseId: "db-1",
  shardMapVersion: 5,
  controlEpoch: 10,
  shards: [{
    logicalDatabaseId: "db-1",
    logicalShardId: "ls-7",
    physicalShardId: "ps-3",
    shardMapVersion: 5,
    shardStatus: "ACTIVE",
    keySpace: { lowerInclusive: "0000", upperExclusive: "ffff" },
    controlEpoch: 10,
    capacityState: "ADMITTED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }],
};

test("authoritative store resolves only from the published shard map head", async () => {
  const store = new D1AuthoritativeMetadataStore(new FakeDb());
  const result = await store.resolve({ logicalDatabaseId: "db-1", logicalShardKey: "abcd", shardMapVersion: 4 });
  assert.deepEqual(result, {
    logicalDatabaseId: "db-1",
    logicalShardId: "ls-7",
    physicalShardId: "ps-3",
    shardMapVersion: 4,
    shardStatus: "ACTIVE",
    keySpace: { lowerInclusive: "0000", upperExclusive: "ffff" },
    controlEpoch: 9,
  });
});

test("authoritative store rejects an unpublished requested version", async () => {
  class HeadDb {
    prepare(sql: string): FakeStatement {
      if (sql.includes("FROM d1f_w06_shard_map_head")) return new FakeStatement([{ shard_map_version: 5, control_epoch: 10 }]);
      throw new Error("metadata query must not execute after unpublished head rejection");
    }
    async batch(): Promise<never[]> { throw new Error("batch must not execute"); }
  }
  const store = new D1AuthoritativeMetadataStore(new HeadDb());
  await assert.rejects(
    () => store.resolve({ logicalDatabaseId: "db-1", logicalShardKey: "abcd", shardMapVersion: 4 }),
    (error: unknown) => error instanceof ShardMapVersionNotPublishedError,
  );
});

test("shard map publication uses one atomic batch and CAS-updates the head", async () => {
  const db = new FakeDb();
  const store = new D1AuthoritativeMetadataStore(db);
  await store.publish({ snapshot, expectedCurrent: { shardMapVersion: 4, controlEpoch: 9 } });
  assert.deepEqual(db.batchCalls, [3]);
});

test("shard map publication rejects a stale epoch before touching D1", async () => {
  const db = new FakeDb();
  const store = new D1AuthoritativeMetadataStore(db);
  await assert.rejects(
    () => store.publish({ snapshot, expectedCurrent: { shardMapVersion: 4, controlEpoch: 11 } }),
    (error: unknown) => error instanceof ShardMapPublicationConflictError,
  );
  assert.deepEqual(db.batchCalls, []);
});
