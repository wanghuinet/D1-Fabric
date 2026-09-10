import { describe, expect, it } from "vitest";
import { assertTargetCatalogConsistent, TargetConsistencyError } from "./target-consistency.ts";
import type { PhysicalTargetCatalog } from "./target.ts";

const db = { prepare() { return {}; }, batch() { return Promise.resolve([]); } };

function catalog(targets: PhysicalTargetCatalog["targets"]): PhysicalTargetCatalog {
  return { version: 1, targets };
}

function target(overrides: Partial<PhysicalTargetCatalog["targets"][number]> = {}) {
  return {
    logicalDatabaseId: "db-a",
    logicalShardId: "shard-0",
    physicalShardId: "ps-0",
    topologyVersion: 1,
    physicalTargetId: "target-0",
    bindingName: "DB_A",
    admitted: true,
    ...overrides,
  } as const;
}

describe("physical target deployment consistency", () => {
  it("accepts an admitted target with a deployed binding", () => {
    expect(() => assertTargetCatalogConsistent(catalog([target()]), { DB_A: db })).not.toThrow();
  });

  it("rejects an admitted target whose binding is absent", () => {
    expect(() => assertTargetCatalogConsistent(catalog([target()]), {})).toThrowError(TargetConsistencyError);
    expect(() => assertTargetCatalogConsistent(catalog([target()]), {})).toThrow(/DB_A/);
  });

  it("rejects one binding mapped to two physical targets", () => {
    expect(() => assertTargetCatalogConsistent(catalog([
      target(),
      target({ physicalTargetId: "target-1", physicalShardId: "ps-1" }),
    ]), { DB_A: db })).toThrow(/one D1 binding/);
  });

  it("rejects one target id mapped to two catalog entries", () => {
    expect(() => assertTargetCatalogConsistent(catalog([
      target(),
      target({ logicalShardId: "shard-1", physicalShardId: "ps-1" }),
    ]), { DB_A: db })).toThrow(/physicalTargetId/);
  });

  it("rejects one logical shard/version mapped to two physical shards", () => {
    expect(() => assertTargetCatalogConsistent(catalog([
      target(),
      target({ physicalShardId: "ps-1", physicalTargetId: "target-1", bindingName: "DB_B" }),
    ]), { DB_A: db, DB_B: db })).toThrow(/logical shard\/version/);
  });

  it("permits non-admitted targets without a live binding", () => {
    expect(() => assertTargetCatalogConsistent(catalog([target({ admitted: false })]), {})).not.toThrow();
  });
});
