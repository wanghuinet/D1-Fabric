import assert from "node:assert/strict";
import { test } from "node:test";
import { routeExecutionPlan, RoutingError, RoutingSnapshotStore, type RoutingMap } from "../src/routing.ts";
import type { ExecutionPlan } from "../src/plan.ts";

const plan = Object.freeze({
  planId: "p1", contractId: "c1", contractVersion: "D1F-3.0-MASTER-v1.0",
  operation: "content.list", operationVersion: "1", requestId: "r1", tenantId: "t1",
  principalScope: "content:read", mode: "READ", deadlineAt: Date.now() + 5000,
  budgetCeiling: Object.freeze({ fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0, payloadBytes: 1024 }),
  requestedBudget: Object.freeze({ fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0, payloadBytes: 1024 }),
  routingRequired: true as const, routingResolved: false as const,
}) as ExecutionPlan;

const map: RoutingMap = Object.freeze({
  t1: Object.freeze({ keyA: Object.freeze({ logicalTargetId: "logical-1", mapVersion: "7" }) }),
  t2: Object.freeze({ keyA: Object.freeze({ logicalTargetId: "logical-2", mapVersion: "7" }) }),
});

test("P05.1 deterministic tenant-scoped route", () => {
  const a = routeExecutionPlan(plan, "keyA", map);
  const b = routeExecutionPlan(plan, "keyA", map);
  assert.deepEqual(a, b);
  assert.equal(a.tenantId, "t1");
  assert.equal(a.logicalTargetId, "logical-1");
});

test("P05.1 isolates tenants", () => {
  const otherTenantPlan = Object.freeze({ ...plan, tenantId: "t2" }) as ExecutionPlan;
  const result = routeExecutionPlan(otherTenantPlan, "keyA", map);
  assert.equal(result.tenantId, "t2");
  assert.equal(result.logicalTargetId, "logical-2");
});

test("P05.1 rejects missing target", () => {
  assert.throws(() => routeExecutionPlan(plan, "missing", map), (e: unknown) => e instanceof RoutingError && e.code === "ROUTING_TARGET_NOT_FOUND");
});

test("P05.1 rejects missing tenant scope", () => {
  const otherTenantPlan = Object.freeze({ ...plan, tenantId: "unknown" }) as ExecutionPlan;
  assert.throws(() => routeExecutionPlan(otherTenantPlan, "keyA", map), (e: unknown) => e instanceof RoutingError && e.code === "ROUTING_TARGET_NOT_FOUND");
});

test("P05.1 rejects malformed routing map", () => {
  assert.throws(() => routeExecutionPlan(plan, "keyA", null as unknown as RoutingMap), (e: unknown) => e instanceof RoutingError && e.code === "ROUTING_MAP_INVALID");
});

test("P05.1 rejects malformed routing entry", () => {
  const malformed = Object.freeze({ t1: Object.freeze({ keyA: Object.freeze({ logicalTargetId: "", mapVersion: "7" }) }) }) as RoutingMap;
  assert.throws(() => routeExecutionPlan(plan, "keyA", malformed), (e: unknown) => e instanceof RoutingError && e.code === "INVALID_ROUTING");
});

test("P05.1 rejects fanout above boundary", () => {
  const over = Object.freeze({ ...plan, requestedBudget: Object.freeze({ ...plan.requestedBudget, fanout: 2 }) }) as ExecutionPlan;
  assert.throws(() => routeExecutionPlan(over, "keyA", map), (e: unknown) => e instanceof RoutingError && e.code === "BUDGET_EXCEEDED");
});

test("P05.1 rejects invalid routing key", () => {
  assert.throws(() => routeExecutionPlan(plan, "", map), (e: unknown) => e instanceof RoutingError && e.code === "INVALID_ROUTING");
});

test("P05.1 never exposes physical storage identifiers", () => {
  const result = routeExecutionPlan(plan, "keyA", map);
  const text = JSON.stringify(result).toLowerCase();
  for (const forbidden of ["physical", "d1", "sql", "databaseid"]) assert.equal(text.includes(forbidden), false);
});

 
test("versioned routing snapshots are exact-match and bounded", () => {
  const store = new RoutingSnapshotStore(2);
  store.publish("7", map);
  store.publish("8", Object.freeze({
    t1: Object.freeze({ keyA: Object.freeze({ logicalTargetId: "logical-8", mapVersion: "8" }) }),
  }));
  store.publish("9", Object.freeze({
    t1: Object.freeze({ keyA: Object.freeze({ logicalTargetId: "logical-9", mapVersion: "9" }) }),
  }));
  assert.deepEqual(store.versions(), ["9", "8"]);
  assert.equal(store.get("7"), undefined);
  const routed = store.resolve(plan, "keyA", "8");
  assert.equal(routed.logicalTargetId, "logical-8");
  assert.throws(
    () => store.resolve(plan, "keyA", "7"),
    (error: unknown) => error instanceof RoutingError && error.code === "ROUTING_SNAPSHOT_NOT_FOUND",
  );
});

test("publishing the same snapshot version replaces only that version", () => {
  const store = new RoutingSnapshotStore();
  store.publish("7", map);
  const replacement = Object.freeze({
    t1: Object.freeze({ keyA: Object.freeze({ logicalTargetId: "logical-replacement", mapVersion: "7" }) }),
  });
  store.publish("7", replacement);
  assert.deepEqual(store.versions(), ["7"]);
  assert.equal(store.get("7")?.routingMap.t1.keyA.logicalTargetId, "logical-replacement");
});

test("snapshot history never silently upgrades to another version", () => {
  const store = new RoutingSnapshotStore();
  store.publish("7", map);
  assert.throws(
    () => store.resolve(plan, "keyA", "8"),
    (error: unknown) => error instanceof RoutingError && error.code === "ROUTING_SNAPSHOT_NOT_FOUND",
  );
});
