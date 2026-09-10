import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";

function writeBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    identity: {
      requestId: "req-1",
      logicalTargetId: "target-1",
      deadlineAt: Date.now() + 5_000,
      budget: { retries: 2 },
    },
    operation: {
      retryable: true,
    },
    ...overrides,
  });
}

function request(body: string): Request {
  return new Request("https://w05/v1/execute", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body,
  });
}

test("ready reports downstream binding availability", async () => {
  const withoutW03 = await worker.fetch(new Request("https://w05/ready"), {});
  assert.equal(withoutW03.status, 200);
  assert.deepEqual(await withoutW03.json(), { service: "d1-fabric-w05-reliability-plane", ready: false });

  const withW03 = await worker.fetch(new Request("https://w05/ready"), {
    W03: { fetch: async () => new Response(null, { status: 204 }) },
  });
  assert.equal(withW03.status, 200);
  assert.deepEqual(await withW03.json(), { service: "d1-fabric-w05-reliability-plane", ready: true });
});

test("retries an explicitly retryable write through W03", async () => {
  let calls = 0;
  const response = await worker.fetch(request(writeBody()), {
    W03: {
      fetch: async () => {
        calls += 1;
        return calls === 1
          ? new Response(JSON.stringify({ status: "ERROR", code: "OVERLOADED" }), { status: 503 })
          : new Response(JSON.stringify({ status: "COMMITTED" }), { status: 200 });
      },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.deepEqual(await response.json(), { status: "COMMITTED" });
});

test("does not retry a non-idempotent write even after a transient upstream failure", async () => {
  let calls = 0;
  const response = await worker.fetch(request(writeBody({ operation: { retryable: false } })), {
    W03: {
      fetch: async () => {
        calls += 1;
        return new Response(JSON.stringify({ status: "ERROR", code: "OVERLOADED" }), { status: 503 });
      },
    },
  });
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
  assert.deepEqual(await response.json(), { status: "ERROR", code: "OPERATION_FAILED", attempts: 1 });
});

test("fails closed when W03 is unavailable", async () => {
  const response = await worker.fetch(request(writeBody()), {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "W03_UNAVAILABLE" });
});

test("returns 404 for unknown routes and 405 is not introduced for non-POST known route", async () => {
  const unknown = await worker.fetch(new Request("https://w05/unknown"), {});
  assert.equal(unknown.status, 404);
  const wrongMethod = await worker.fetch(new Request("https://w05/v1/execute"), {});
  assert.equal(wrongMethod.status, 404);
});
