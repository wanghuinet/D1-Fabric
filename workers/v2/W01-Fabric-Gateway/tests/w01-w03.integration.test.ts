import test from "node:test";
import assert from "node:assert/strict";
import gateway from "../src/index.ts";
import w02 from "../../W02-Execution-Fabric/src/index.ts";
import w03 from "../../W03-Write-Fabric/src/index.ts";
import type { ServiceBinding as W01Binding } from "../src/index.ts";
import type { ServiceBinding as W02Binding } from "../../W02-Execution-Fabric/src/index.ts";
import type { D1DatabaseLike, PreparedStatementLike, D1ResultLike } from "../../W03-Write-Fabric/src/write.ts";

class FakeStatement implements PreparedStatementLike {
  constructor(private readonly sql: string, private readonly values: unknown[]) {}
  bind(...values: never[]): PreparedStatementLike { return new FakeStatement(this.sql, values); }
  async run(): Promise<D1ResultLike> {
    return { success: true, meta: { changes: this.sql.startsWith("UPDATE") ? 1 : 0, rows_written: this.sql.startsWith("UPDATE") ? 1 : 0 } };
  }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    return { results: [] };
  }
}

class FakeDb implements D1DatabaseLike {
  prepare(sql: string): PreparedStatementLike { return new FakeStatement(sql, []); }
  async batch(statements: PreparedStatementLike[]): Promise<D1ResultLike[]> {
    return statements.map(() => ({ success: true, meta: { changes: 1, rows_written: 1 } }));
  }
}

const w03Binding: W02Binding = {
  fetch: (request) => w03.fetch(request, { DB: new FakeDb() }),
};
const w02Binding: W01Binding = {
  fetch: (request) => w02.fetch(request, { W03: w03Binding }),
};

function writeEnvelope() {
  return {
    request: {
      requestId: "integration-w03-1", tenantId: "tenant-1", principalScope: "scope-1",
      operation: "content.write", operationVersion: "1", deadlineAt: Date.now() + 5_000,
      budget: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 0, rowsWritten: 1, retries: 0, payloadBytes: 1024 },
      payload: {
        write: {
          logicalTargetId: "content-1",
          executionEpoch: 1,
          operation: { statement: "UPDATE content SET title = ? WHERE id = ?", bindings: ["hello", "1"], retryable: false, expectedWriteCount: 1 },
        },
      },
    },
    contract: {
      contractId: "content-write-v1", contractVersion: "D1F-3.0-MASTER-v1.0", operation: "content.write", operationVersion: "1", mode: "WRITE", maxDeadlineMs: 25_000,
      limits: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 0, rowsWritten: 1, retries: 0, payloadBytes: 1024 },
    },
  };
}

test("W01 -> W02 -> W03 propagates identity and commits a write", async () => {
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(writeEnvelope()), headers: { "content-type": "application/json" },
  }), { W02: w02Binding });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "COMMITTED",
    requestId: "integration-w03-1",
    contractId: "content-write-v1",
    contractVersion: "D1F-3.0-MASTER-v1.0",
    logicalTargetId: "content-1",
    executionEpoch: 1,
    accounting: { d1Statements: 1, rowsWritten: 1, payloadBytes: 17, retries: 0 },
    affectedRows: 1,
  });
});

test("W01 -> W02 rejects a write when W03 binding is unavailable", async () => {
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(writeEnvelope()), headers: { "content-type": "application/json" },
  }), { W02: { fetch: (request) => w02.fetch(request, {}) } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "W03_UNAVAILABLE" });
});
