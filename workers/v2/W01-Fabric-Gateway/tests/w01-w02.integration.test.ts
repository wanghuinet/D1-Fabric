import test from "node:test";
import assert from "node:assert/strict";
import gateway from "../src/index.ts";
import w02 from "../../W02-Execution-Fabric/src/index.ts";
import type { ServiceBinding } from "../src/index.ts";

function envelope() {
  return {
    request: {
      requestId: "integration-1", tenantId: "tenant-1", principalScope: "scope-1",
      operation: "query.read", operationVersion: "1", deadlineAt: Date.now() + 5_000,
      budget: { fanout: 0, concurrency: 0, d1Statements: 0, rowsRead: 0, rowsWritten: 0, retries: 0 }, payload: { query: "bounded" },
    },
    contract: {
      contractId: "query-read-v1", contractVersion: "D1F-3.0-MASTER-v1.0", operation: "query.read", operationVersion: "1", mode: "READ", maxDeadlineMs: 25_000,
      limits: { fanout: 0, concurrency: 0, d1Statements: 0, rowsRead: 0, rowsWritten: 0, retries: 0, payloadBytes: 1024 },
    },
  };
}

const binding: ServiceBinding = {
  fetch: (request) => w02.fetch(request),
};

test("W01 forwards a valid contract and W02 compiles it", async () => {
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(envelope()), headers: { "content-type": "application/json" },
  }), { W02: binding });
  assert.equal(response.status, 200);
  const body = await response.json() as { status: string; plan: { requestId: string; tenantId: string; contractVersion: string; routingRequired: boolean } };
  assert.equal(body.status, "COMPILED");
  assert.equal(body.plan.requestId, "integration-1");
  assert.equal(body.plan.tenantId, "tenant-1");
  assert.equal(body.plan.contractVersion, "D1F-3.0-MASTER-v1.0");
  assert.equal(body.plan.routingRequired, true);
});

test("W01 preserves W02 contract validation errors", async () => {
  const body = envelope();
  (body.contract as any).contractVersion = "invalid";
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  }), { W02: binding });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "INVALID_CONTRACT" });
});
