import assert from "node:assert/strict";
import { test } from "node:test";
import { routeExecutionPlan, RoutingError, type RoutingMap } from "../src/routing.ts";
import type { ExecutionPlan } from "../src/plan.ts";

const plan = Object.freeze({
  planId: "p1", contractId: "c1", contractVersion: "D1F-3.0-MASTER-v1.0",
  operation: "content.list", operationVersion: "1", requestId: "r1", tenantId: "t1",
  principalScope: "content:read", mode: "READ", deadlineAt: Date.now() + 5000,
  budgetCeiling: Object.freeze({ fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0, payloadBytes: 1024 }),
  requestedBudget: Object.freeze({ fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0, payloadBytes: 1024 }),
  routingRequired: true as const, routingResolved: false as const,
}) as ExecutionPlan;

const map: RoutingMap = Object.freeze({ keyA: Object.freeze({ logicalTargetId: "logical-1", mapVersion: "7" }) });

test("P05.1 deterministic route", () => {
  const a = routeExecutionPlan(plan, "keyA", map);
  const b = routeExecutionPlan(plan, "keyA", map);
  assert.deepEqual(a, b);
  assert.equal(a.tenantId, "t1");
});

test("P05.1 rejects missing target", () => {
  assert.throws(() => routeExecutionPlan(plan, "missing", map), (e: unknown) => e instanceof RoutingError && e.code === "ROUTING_TARGET_NOT_FOUND");
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
