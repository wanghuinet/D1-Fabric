import assert from "node:assert/strict";
import { test } from "node:test";
import { compileExecutionPlan, PlanCompileError, MASTER_CONTRACT_VERSION, validateRoutingSelection, type BudgetLimits, type ExecutionRequest, type VersionedExecutionContract } from "../src/plan.ts";

const budget: BudgetLimits = {
  fanout: 4,
  concurrency: 4,
  d1Statements: 8,
  rowsRead: 100,
  rowsWritten: 0,
  retries: 0,
  payloadBytes: 1024,
};

function makeRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
  return {
    requestId: "req-1",
    tenantId: "tenant-1",
    principalScope: "content:read",
    operation: "content.list",
    operationVersion: "1",
    deadlineAt: Date.now() + 5000,
    budget,
    ...overrides,
  };
}

function makeContract(overrides: Partial<VersionedExecutionContract> = {}): VersionedExecutionContract {
  return {
    contractId: "cap.content.list",
    contractVersion: MASTER_CONTRACT_VERSION,
    operation: "content.list",
    operationVersion: "1",
    mode: "READ",
    maxDeadlineMs: 25_000,
    limits: budget,
    ...overrides,
  };
}

test("P04.1 compiles deterministically for identical validated identity", () => {
  const a = compileExecutionPlan(makeRequest(), makeContract());
  const b = compileExecutionPlan(makeRequest({ deadlineAt: a.deadlineAt }), makeContract());
  assert.equal(a.planId, b.planId);
  assert.equal(a.routingResolved, false);
  assert.equal(a.routingRequired, true);
  assert.equal(a.contractVersion, MASTER_CONTRACT_VERSION);
});

test("P04.1 validates the W06-compatible routing selection shape", () => {
  assert.doesNotThrow(() => validateRoutingSelection({
    logicalDatabaseId: "db-1",
    logicalShardId: "ls-1",
    physicalShardId: "ps-1",
    topologyVersion: 3,
  }));
  assert.throws(
    () => validateRoutingSelection({ logicalDatabaseId: "db-1", logicalShardId: "ls-1", physicalShardId: "ps-1", topologyVersion: 0 }),
    (error: unknown) => error instanceof PlanCompileError && error.code === "INVALID_REQUEST",
  );
});

test("P04.1 rejects budget above contract ceiling", () => {
  assert.throws(
    () => compileExecutionPlan(makeRequest({ budget: { ...budget, rowsRead: 101 } }), makeContract()),
    (error: unknown) => error instanceof PlanCompileError && error.code === "BUDGET_EXCEEDED",
  );
});

test("P04.1 rejects deadline above contract ceiling", () => {
  assert.throws(
    () => compileExecutionPlan(makeRequest({ deadlineAt: Date.now() + 30_000 }), makeContract({ maxDeadlineMs: 1000 })),
    (error: unknown) => error instanceof PlanCompileError && error.code === "DEADLINE_EXCEEDED",
  );
});

test("P04.1 rejects master contract version drift", () => {
  assert.throws(
    () => compileExecutionPlan(makeRequest(), makeContract({ contractVersion: "D1F-OLD" })),
    (error: unknown) => error instanceof PlanCompileError && error.code === "INVALID_CONTRACT",
  );
});

test("P04.1 rejects unsafe numeric limits", () => {
  assert.throws(
    () => compileExecutionPlan(makeRequest({ budget: { ...budget, fanout: Number.MAX_SAFE_INTEGER + 1 } }), makeContract()),
    (error: unknown) => error instanceof PlanCompileError && error.code === "INVALID_LIMIT",
  );
});

test("P04.1 returns an immutable plan and immutable budget snapshots", () => {
  const request = makeRequest();
  const contract = makeContract();
  const plan = compileExecutionPlan(request, contract);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.requestedBudget), true);
  assert.equal(Object.isFrozen(plan.budgetCeiling), true);
});

test("P04.1 contains no physical topology fields", () => {
  const plan = compileExecutionPlan(makeRequest(), makeContract());
  const text = JSON.stringify(plan).toLowerCase();
  for (const forbidden of ["physical", "shardid", "databaseid", "sql", "workergraph", "placement"]) {
    assert.equal(text.includes(forbidden), false, `unexpected topology field: ${forbidden}`);
  }
});
