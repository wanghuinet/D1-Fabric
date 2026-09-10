import assert from "node:assert/strict";
import test from "node:test";
import { D1AuthoritativeMetadataStore } from "../src/authoritative-store.ts";

class FakeStatement {
  private values: unknown[] = [];
  constructor(private readonly rows: Record<string, unknown>[]) {}
  bind(...values: unknown[]): FakeStatement { this.values = values; return this; }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    assert.deepEqual(this.values, ["db-1", 4]);
    return { results: this.rows as T[] };
  }
}

class FakeDb {
  prepare(_sql: string): FakeStatement {
    return new FakeStatement([{
      logical_database_id: "db-1",
      logical_shard_id: "ls-7",
      physical_shard_id: "ps-3",
      topology_version: 4,
      lifecycle: "ACTIVE",
      capacity_state: "ADMITTED",
      creation_timestamp: 1,
      last_transition_timestamp: 2,
    }]);
  }
}

test("authoritative store resolves only from persisted topology metadata", async () => {
  const store = new D1AuthoritativeMetadataStore(new FakeDb());
  const result = await store.resolve({ logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 });
  assert.deepEqual(result, {
    logicalDatabaseId: "db-1",
    logicalShardId: "ls-7",
    physicalShardId: "ps-3",
    topologyVersion: 4,
  });
});

test("authoritative store fails closed when the requested version is absent", async () => {
  class EmptyDb {
    prepare(_sql: string): FakeStatement { return new FakeStatement([]); }
  }
  const store = new D1AuthoritativeMetadataStore(new EmptyDb());
  await assert.rejects(
    () => store.resolve({ logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 }),
    /invalid metadata snapshot/,
  );
});
