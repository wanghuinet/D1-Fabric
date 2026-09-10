import test from "node:test";
import assert from "node:assert/strict";
import worker, { type ServiceBinding } from "../src/index.ts";

function validEnvelope() {
  return {
    request: {
      requestId: "req-1", tenantId: "tenant-1", principalScope: "scope-1",
      operation: "query.read", operationVersion: "1", deadlineAt: Date.now() + 5_000,
      budget: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0 }, payload: { bounded: true },
    },
    contract: {
      contractId: "query-read-v1", contractVersion: "D1F-3.0-MASTER-v1.0", operation: "query.read", operationVersion: "1", mode: "READ", maxDeadlineMs: 25_000,
      limits: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0, payloadBytes: 1024 },
    },
  };
}

function post(body: unknown, w02: ServiceBinding = { fetch: async () => new Response(JSON.stringify({ status: "COMPILED" }), { status: 200, headers: { "content-type": "application/json" } }) }) {
  return worker.fetch(new Request("https://gateway.invalid/", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }), { W02: w02 });
}

test("forwards the validated envelope to W02 and preserves its response", async () => {
  let forwarded: any;
  const envelope = validEnvelope();
  const w02: ServiceBinding = { fetch: async (request) => { forwarded = await request.json(); return new Response(JSON.stringify({ status: "COMPILED" }), { status: 201, headers: { "content-type": "application/json" } }); } };
  const response = await post(envelope, w02);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { status: "COMPILED" });
  assert.equal(forwarded.request.requestId, envelope.request.requestId);
  assert.equal(forwarded.contract.contractId, envelope.contract.contractId);
});

test("forwards request identity and contract without duplicating W02 execution", async () => {
  let forwarded: any;
  const envelope = validEnvelope();
  const w02: ServiceBinding = { fetch: async (request) => { forwarded = await request.json(); return new Response("ok"); } };
  await post(envelope, w02);
  assert.equal(forwarded.request.tenantId, envelope.request.tenantId);
  assert.equal(forwarded.contract.contractVersion, envelope.contract.contractVersion);
});

test("returns W02_UNAVAILABLE when service binding is absent", async () => {
  const response = await worker.fetch(new Request("https://gateway.invalid/", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }), {});
  assert.equal(response.status, 503);
});

test("returns W02_UNAVAILABLE when W02 fetch fails", async () => {
  const response = await post(validEnvelope(), { fetch: async () => { throw new Error("upstream"); } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "W02_UNAVAILABLE" });
});

test("expired request is rejected before W02 invocation", async () => {
  let called = false;
  const envelope = validEnvelope();
  (envelope.request as any).deadlineAt = Date.now() - 1;
  const response = await post(envelope, { fetch: async () => { called = true; return new Response("unexpected"); } });
  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("method and media type are rejected at the gateway", async () => {
  const get = await worker.fetch(new Request("https://gateway.invalid/", { method: "GET" }), {});
  assert.equal(get.status, 405);
  const media = await worker.fetch(new Request("https://gateway.invalid/", { method: "POST", body: "{}", headers: { "content-type": "text/plain" } }), {});
  assert.equal(media.status, 415);
});
