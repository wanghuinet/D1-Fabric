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
        logicalDatabaseId: "db-1",
        logicalShardId: "shard-1",
        logicalTargetId: "target-1",
        topologyVersion: 7,
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

function request(): Request {
  return new Request("https://w02/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody),
  });
}

function resolvedW06(overrides: Record<string, unknown> = {}) {
  let calls = 0;
  const binding = {
    get calls() { return calls; },
    fetch: async (incoming: Request) => {
      calls += 1;
      assert.equal(new URL(incoming.url).pathname, "/v1/placement/resolve");
      assert.equal(incoming.method, "POST");
      const body = await incoming.json() as { request: { logicalDatabaseId: string; logicalShardId: string; topologyVersion: number } };
      assert.deepEqual(body.request, { logicalDatabaseId: "db-1", logicalShardId: "shard-1", topologyVersion: 7 });
      return new Response(JSON.stringify({
        status: "RESOLVED",
        result: {
          logicalDatabaseId: "db-1",
          logicalShardId: "shard-1",
          physicalShardId: "physical-7",
          topologyVersion: 7,
          ...overrides,
        },
      }), { status: 200, headers: { "content-type": "application/json; charset=utf-8" } });
    },
  };
  return binding;
}

test("routes compiled writes through W06 then W05 with authoritative physical shard preserved", async () => {
  const w06 = resolvedW06();
  let w05Calls = 0;
  const response = await worker.fetch(request(), {
    W06: w06,
    W05: {
      fetch: async (upstream) => {
        w05Calls += 1;
        const forwarded = await upstream.json() as { identity?: { logicalTargetId?: string; logicalDatabaseId?: string; logicalShardId?: string; physicalShardId?: string; topologyVersion?: number }; operation?: { retryable?: boolean } };
        assert.deepEqual(forwarded.identity, {
          requestId: forwarded.identity?.requestId,
          planId: forwarded.identity?.planId,
          contractId: "contract-1",
          contractVersion: "D1F-3.0-MASTER-v1.0",
          architectureId: "D1F-3.0-ARCH-v1.0",
          tenantId: "tenant-1",
          principalScope: "scope-1",
          operation: "write",
          operationVersion: "v1",
          logicalDatabaseId: "db-1",
          logicalShardId: "shard-1",
          logicalTargetId: "target-1",
          physicalShardId: "physical-7",
          topologyVersion: 7,
          executionEpoch: 1,
          deadlineAt: forwarded.identity?.deadlineAt,
          budget: { d1Statements: 1, rowsWritten: 1, payloadBytes: 1024, retries: 1 },
        });
        assert.equal(forwarded.operation?.retryable, true);
        return new Response(JSON.stringify({ status: "COMMITTED" }), { status: 200, headers: { "content-type": "application/json" } });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.equal(w06.calls, 1);
  assert.equal(w05Calls, 1);
  assert.deepEqual(await response.json(), { status: "COMMITTED" });
});

test("rejects a write that has no resolved topology version", async () => {
  const body = structuredClone(requestBody) as typeof requestBody;
  delete (body.request.payload.write as { topologyVersion?: number }).topologyVersion;
  const response = await worker.fetch(new Request("https://w02/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), {
    W06: { fetch: async () => { throw new Error("must not dispatch"); } },
    W05: { fetch: async () => { throw new Error("must not dispatch"); } },
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "INVALID_REQUEST" });
});

test("fails closed when W06 is unavailable for a write", async () => {
  const response = await worker.fetch(request(), {
    W05: { fetch: async () => { throw new Error("must not dispatch"); } },
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "W06_UNAVAILABLE" });
});

test("rejects a topology-version mismatch returned by W06", async () => {
  const w06 = resolvedW06({ topologyVersion: 8 });
  const response = await worker.fetch(request(), {
    W06: w06,
    W05: { fetch: async () => { throw new Error("must not dispatch"); } },
  });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "W06_ROUTING_CONFLICT" });
});

test("rejects an incomplete authoritative placement returned by W06", async () => {
  const w06 = resolvedW06({ physicalShardId: "" });
  const response = await worker.fetch(request(), {
    W06: w06,
    W05: { fetch: async () => { throw new Error("must not dispatch"); } },
  });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "W06_INVALID_RESPONSE" });
});

test("fails closed when W05 is unavailable after authoritative placement", async () => {
  const w06 = resolvedW06();
  const response = await worker.fetch(request(), { W06: w06 });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "W05_UNAVAILABLE" });
  assert.equal(w06.calls, 0);
});
