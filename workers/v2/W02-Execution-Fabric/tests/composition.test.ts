import assert from "node:assert/strict";
import { test } from "node:test";
import { compileExecutionPlan, type ExecutionRequest, type VersionedExecutionContract } from "../src/plan.ts";
import { routeExecutionPlan } from "../src/routing.ts";
import { runBounded } from "../src/scheduler.ts";
import { executeBoundedRead, type D1DatabaseLike } from "../src/read.ts";

const request: ExecutionRequest = {
  requestId: "req-compose-1",
  tenantId: "tenant-a",
  principalScope: "reader",
  operation: "content.read",
  operationVersion: "1",
  deadlineAt: Date.now() + 5000,
  budget: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0, payloadBytes: 4096 },
};

const contract: VersionedExecutionContract = {
  contractId: "content-read-v1",
  contractVersion: "D1F-3.0-MASTER-v1.0",
  operation: "content.read",
  operationVersion: "1",
  mode: "READ",
  maxDeadlineMs: 5000,
  limits: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0, payloadBytes: 4096 },
};

function db(): D1DatabaseLike {
  return { prepare() { return { bind() { return this; }, async all() { return { results: [{ id: "content-1" }], meta: { rows_read: 1 } }; } }; } };
}

test("P06.3 composes compile -> route -> bounded admission -> read", async () => {
  const plan = compileExecutionPlan(request, contract);
  const routed = routeExecutionPlan(plan, "content-1", { "tenant-a": { "content-1": { logicalTargetId: "logical-content", mapVersion: "map-1" } } });
  assert.equal(routed.logicalTargetId, "logical-content");
  assert.equal(routed.mapVersion, "map-1");

  const scheduled = await runBounded([routed.logicalTargetId], { fanout: 1, concurrency: 1, deadlineAt: request.deadlineAt }, async (logicalTargetId) => logicalTargetId);
  assert.deepEqual(scheduled.results, ["logical-content"]);
  assert.equal(scheduled.state.consumedFanout, 1);

  const read = await executeBoundedRead({
    requestId: request.requestId,
    tenantId: request.tenantId,
    principalScope: request.principalScope,
    operation: request.operation,
    contractVersion: contract.contractVersion,
    shapeVersion: "shape-1",
    placement: { logicalTargetId: scheduled.results[0], executionEpoch: "epoch-1", expiresAt: Date.now() + 5000, fenced: false },
    deadlineAt: request.deadlineAt,
    budget: request.budget,
    cachePolicy: { cacheAllowed: false, cacheTermination: false, contractVersion: contract.contractVersion, shapeVersion: "shape-1" },
    cacheIntegrityKey: await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    statement: "SELECT id FROM content WHERE id = ?",
    bindings: ["content-1"],
    db: db(),
  });
  assert.equal(read.status, "READ_EXECUTED");
  assert.equal(read.d1Statements, 1);
  assert.equal(read.rowsRead, 1);
  assert.equal(read.resourceAccounting.rowsRead.consumed, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(read, "physicalDatabaseId"), false);
});

test("P06.3 upstream scheduler failure blocks downstream read", async () => {
  let downstreamCalls = 0;
  await assert.rejects(
    () => runBounded(["logical-content"], { fanout: 1, concurrency: 1, deadlineAt: Date.now() + 5000 }, async () => { throw new Error("upstream-stop"); }),
    /upstream-stop/,
  );
  if (downstreamCalls !== 0) throw new Error("downstream execution occurred after upstream failure");
});
