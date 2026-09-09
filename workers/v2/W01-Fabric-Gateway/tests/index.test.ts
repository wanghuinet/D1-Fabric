import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.ts";

const valid = {
  requestId: "req-1",
  tenantId: "tenant-1",
  principalScope: "scope-1",
  operation: "query.read",
  operationVersion: "1",
  deadlineAt: Date.now() + 5_000,
  budget: {
    fanout: 0,
    concurrency: 0,
    d1Statements: 0,
    rowsRead: 0,
    rowsWritten: 0,
    retries: 0,
  },
  payload: { bounded: true },
};

test("GET is rejected without executing", async () => {
  const response = await worker.fetch(new Request("https://example.invalid/", { method: "GET" }));
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: "METHOD_NOT_ALLOWED" });
});

test("malformed JSON is rejected", async () => {
  const response = await worker.fetch(
    new Request("https://example.invalid/", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "INVALID_REQUEST" });
});

test("missing budget is rejected", async () => {
  const body = { ...valid } as Record<string, unknown>;
  delete body.budget;
  const response = await worker.fetch(
    new Request("https://example.invalid/", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "INVALID_BUDGET" });
});

test("payload above 1 MiB is rejected before JSON parsing", async () => {
  const response = await worker.fetch(
    new Request("https://example.invalid/", {
      method: "POST",
      body: "x",
      headers: {
        "content-type": "application/json",
        "content-length": "1048577",
      },
    }),
  );
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "PAYLOAD_TOO_LARGE" });
});

test("valid request returns a topology-neutral validation envelope", async () => {
  const response = await worker.fetch(
    new Request("https://example.invalid/", {
      method: "POST",
      body: JSON.stringify(valid),
      headers: { "content-type": "application/json" },
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "VALIDATED",
    requestId: "req-1",
    operation: "query.read",
    operationVersion: "1",
    contractVersion: "D1F-3.0-MASTER-v1.0",
  });
});
