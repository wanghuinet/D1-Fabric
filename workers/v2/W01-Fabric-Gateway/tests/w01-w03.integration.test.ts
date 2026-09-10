import assert from "node:assert/strict";
import { test } from "node:test";
import gateway from "../src/index.ts";
import w02 from "../../W02-Execution-Fabric/src/index.ts";
import w03 from "../../W03-Write-Fabric/src/index.ts";
import w04 from "../../W04-Control-Plane/src/index.ts";
import w05 from "../../W05-Reliability-Plane/src/index.ts";
import w06 from "../../W06-Control-Plane/src/index.ts";

const CONTROL_PLANE_ADMIN_TOKEN = "integration-admin";

const now = Date.now();

function writeEnvelope(executionEpoch = 1) {
  return {
    request: {
      requestId: `integration-w03-${executionEpoch}`,
      tenantId: "tenant-1",
      principalScope: "integration",
      operation: "content.write",
      operationVersion: "v1",
      deadlineAt: now + 30_000,
      budget: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 0, rowsWritten: 1, retries: 0, payloadBytes: 123 },
      payload: {
        write: {
          logicalDatabaseId: "db-1",
          logicalShardId: "shard-1",
          logicalTargetId: "content-1",
          executionEpoch,
          topologyVersion: 1,
          operation: { sql: "INSERT INTO content(id) VALUES (?)", params: [executionEpoch] },
        },
      },
    },
    contract: {
      contractId: "content-write-v1",
      contractVersion: "D1F-3.0-MASTER-v1.0",
      operation: "content.write",
      operationVersion: "v1",
      mode: "WRITE",
      maxDeadlineMs: 30_000,
      limits: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 0, rowsWritten: 1, retries: 0, payloadBytes: 123 },
    },
  };
}

const w06Binding = {
  fetch: (request: Request) => w06.fetch(request, {
    DB: {
      prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }), run: async () => ({ success: true, meta: { changes: 1 } }) }) }),
      batch: async () => [],
    },
  }),
};

const w05Binding = {
  fetch: (request: Request) => w05.fetch(request, { W03: { fetch: (inner: Request) => w03.fetch(inner, { DB: {} as never }) } }),
};

const w02Binding = {
  fetch: (request: Request) => w02.fetch(request, { W05: w05Binding, W06: w06Binding }),
};

async function publishEpoch(epoch: number): Promise<void> {
  const response = await w04.fetch(new Request("https://control.invalid/v1/control/publish", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${CONTROL_PLANE_ADMIN_TOKEN}` },
    body: JSON.stringify({ configVersion: epoch, epoch, activationTime: now - 1_000, expiryTime: now + 60_000, source: "integration", payload: { placement: { logical: 64 } } }),
  }), { ADMIN_TOKEN: CONTROL_PLANE_ADMIN_TOKEN, DB: {} as never });
  assert.equal(response.status, 201);
}

test("W01 -> W02 -> W06 -> W05 -> W03 -> W04 control epoch gate commits a routed write", async () => {
  await publishEpoch(1);
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(writeEnvelope(1)), headers: { "content-type": "application/json" },
  }), { W02: w02Binding });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "COMMITTED", requestId: "integration-w03-1", contractId: "content-write-v1",
    contractVersion: "D1F-3.0-MASTER-v1.0", logicalTargetId: "content-1", physicalShardId: "physical-content-1", topologyVersion: 1, executionEpoch: 1,
    accounting: { d1Statements: 1, rowsWritten: 1, payloadBytes: 123, retries: 0 }, affectedRows: 1,
  });
});

test("W01 -> W02 -> W05 -> W03 rejects a stale W04 control epoch", async () => {
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(writeEnvelope(2)), headers: { "content-type": "application/json" },
  }), { W02: w02Binding });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { status: "ERROR", code: "STALE_EXECUTION_EPOCH", message: "epoch is not the active control epoch" });
});

test("W01 -> W02 -> W06 -> W05 rejects a write when W03 binding is unavailable", async () => {
  const unavailableW05 = {
    fetch: (request: Request) => w05.fetch(request, {}),
  };
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(writeEnvelope()), headers: { "content-type": "application/json" },
  }), { W02: { fetch: (request) => w02.fetch(request, { W05: unavailableW05, W06: w06Binding }) } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "W03_UNAVAILABLE" });
});
