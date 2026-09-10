import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";

const requestBody = {
  request: {
    requestId: "req-1",
    tenantId: "tenant-1",
    principalScope: "scope-1",
    operation: "write",
    operationVersion: "v1",
    deadlineAt: Date.now() + 5_000,
    budget: {
      fanout: 1,
      concurrency: 1,
      d1Statements: 1,
      rowsRead: 0,
      rowsWritten: 1,
      retries: 1,
      payloadBytes: 1024,
    },
    payload: {
      write: {
        logicalTargetId: "target-1",
        executionEpoch: 1,
        operation: {
          statement: "UPDATE items SET value = ?",
          bindings: ["ok"],
          retryable: true,
          idempotencyKey: "idem-1",
          atomicIdempotency: {
            guardedMutation: {
              sql: "UPDATE items SET value = ?",
              bindings: ["ok"],
            },
          },
        },
      },
    },
  },
  contract: {
    contractId: "contract-1",
    contractVersion: "D1F-3.0-MASTER-v1.0",
    operation: "write",
    operationVersion: "v1",
    mode: "WRITE",
    maxDeadlineMs: 25_000,
    limits: {
      fanout: 1,
      concurrency: 1,
      d1Statements: 5,
      rowsRead: 0,
      rowsWritten: 1,
      retries: 1,
      payloadBytes: 1024,
    },
  },
};

test("routes compiled writes through W05 instead of calling W03 directly", async () => {
  let w05Calls = 0;
  const w05Body = new Response(JSON.stringify({ status: "COMMITTED" }), { status: 200 });
  const response = await worker.fetch(new Request("https://w02/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody),
  }), {
    W05: {
      fetch: async (request) => {
        w05Calls += 1;
        assert.equal(new URL(request.url).pathname, "/v1/execute");
        assert.equal(request.method, "POST");
        const forwarded = await request.json() as { identity?: { logicalTargetId?: string }; operation?: { retryable?: boolean } };
        assert.equal(forwarded.identity?.logicalTargetId, "target-1");
        assert.equal(forwarded.operation?.retryable, true);
        return w05Body;
      },
    },
  });

  assert.equal(response.status, 200);
  assert.equal(w05Calls, 1);
  assert.deepEqual(await response.json(), { status: "COMMITTED" });
});

test("fails closed when W05 is unavailable for a write", async () => {
  const response = await worker.fetch(new Request("https://w02/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody),
  }), {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "W05_UNAVAILABLE" });
});
