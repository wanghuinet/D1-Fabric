import assert from "node:assert/strict";
import test from "node:test";
import { D1AuthoritativeMetadataStore } from "../src/authoritative-store.ts";

class FakeStatement {
  private values: unknown[] = [];
  private readonly rows: Record<string, unknown>[];

  constructor(rows: Record<string, unknown>[]) {
    this.rows = rows;
  }

  bind(...values: unknown[]): FakeStatement {
    this.values = values;
    return this;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    if (this.rows.length === 1 && "topology_version" in this.rows[0] && Object.keys(this.rows[0]).length === 1) {
      assert.deepEqual(this.values, ["db-1"]);
    } else {
      assert.deepEqual(this.values, ["db-1", 4]);
    }
    return { results: this.rows as T[] };
  }
}

class FakeDb {
  prepare(sql: string): FakeStatement {
    if (sql.includes("FROM d1f_w06_topology_head")) {
      return new FakeStatement([{ topology_version: 4 }]);
    }
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

test("authoritative store resolves only from the published topology head", async () => {
  const store = new D1AuthoritativeMetadataStore(new FakeDb());
  const result = await store.resolve({ logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 });
  assert.deepEqual(result, {
    logicalDatabaseId: "db-1",
    logicalShardId: "ls-7",
    physicalShardId: "ps-3",
    topologyVersion: 4,
  });
});

test("authoritative store rejects an unpublished requested version", async () => {
  class HeadDb {
    prepare(sql: string): FakeStatement {
      if (sql.includes("FROM d1f_w06_topology_head")) return new FakeStatement([{ topology_version: 5 }]);
      throw new Error("metadata query must not execute after unpublished head rejection");
    }
  }
  const store = new D1AuthoritativeMetadataStore(new HeadDb());
  await assert.rejects(
    () => store.resolve({ logicalDatabaseId: "db-1", logicalShardId: "ls-7", topologyVersion: 4 }),
    (error: unknown) => error instanceof Error && error.message === "requested topology version is not the published head",
  );
});
