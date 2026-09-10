import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.ts";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function post(body: unknown, contentType = "application/json") {
  return worker.fetch(
    new Request("https://example.invalid/", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": contentType },
    }),
  );
}

test("GET is rejected without executing", async () => {
  const response = await worker.fetch(new Request("https://example.invalid/", { method: "GET" }));
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: "METHOD_NOT_ALLOWED" });
});

test("missing content type is rejected before body processing", async () => {
  const response = await worker.fetch(
    new Request("https://example.invalid/", { method: "POST", body: JSON.stringify(validBody()) }),
  );
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "UNSUPPORTED_MEDIA_TYPE" });
});

test("non-JSON content type is rejected", async () => {
  const response = await post(validBody(), "text/plain");
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "UNSUPPORTED_MEDIA_TYPE" });
});

test("JSON content type parameters are accepted", async () => {
  const response = await post(validBody(), "Application/JSON; charset=utf-8");
  assert.equal(response.status, 200);
  const body = await response.json() as { status: string; next: string; envelope: Record<string, unknown> };
  assert.equal(body.status, "ADMITTED");
  assert.equal(body.next, "W02");
  assert.equal(body.envelope.envelopeVersion, "1.0");
  assert.equal(body.envelope.contractVersion, "D1F-3.0-MASTER-v1.0");
  assert.equal(body.envelope.architectureId, "D1F-3.0-ARCH-v1.0");
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
  const body = validBody();
  delete (body as Record<string, unknown>).budget;
  const response = await post(body);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "INVALID_BUDGET" });
});

test("nonzero execution budget is rejected at W01", async () => {
  const body = validBody({ budget: { ...validBody().budget, d1Statements: 1 } });
  const response = await post(body);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "BUDGET_EXCEEDED" });
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

test("envelope preserves normalized request and measured payload bytes", async () => {
  const payload = { bounded: true };
  const response = await post(validBody({ payload }));
  assert.equal(response.status, 200);
  const body = await response.json() as { envelope: { requestId: string; tenantId: string; operation: string; operationVersion: string; payload: unknown; budget: { payloadBytes: number } } };
  assert.equal(body.envelope.requestId, "req-1");
  assert.equal(body.envelope.tenantId, "tenant-1");
  assert.equal(body.envelope.operation, "query.read");
  assert.equal(body.envelope.operationVersion, "1");
  assert.deepEqual(body.envelope.payload, payload);
  assert.ok(body.envelope.budget.payloadBytes > 0);
});

test("operation tokens reject unsafe delimiters", async () => {
  const response = await post(validBody({ operation: "query/read" }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "INVALID_REQUEST" });
});
