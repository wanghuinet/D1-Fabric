import test from "node:test";
import assert from "node:assert/strict";
import gateway from "../src/index.ts";
import w02 from "../../W02-Execution-Fabric/src/index.ts";
import w03 from "../../W03-Write-Fabric/src/index.ts";
import w04 from "../../W04-Control-Plane/src/index.ts";
import type { ServiceBinding as W01Binding } from "../src/index.ts";
import type { ServiceBinding as W02Binding } from "../../W02-Execution-Fabric/src/index.ts";
import type { D1DatabaseLike, PreparedStatementLike, D1ResultLike, D1Value } from "../../W03-Write-Fabric/src/write.ts";
import type { D1DatabaseLike as W04Db } from "../../W04-Control-Plane/src/store.ts";

class FakeStatement implements PreparedStatementLike {
  constructor(private readonly sql: string) {}
  bind(..._values: D1Value[]): PreparedStatementLike { return new FakeStatement(this.sql); }
  async run(): Promise<D1ResultLike> {
    return { success: true, meta: { changes: this.sql.startsWith("UPDATE") ? 1 : 0, rows_written: this.sql.startsWith("UPDATE") ? 1 : 0 } };
  }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> { return { results: [] }; }
}

class FakeDb implements D1DatabaseLike {
  prepare(sql: string): PreparedStatementLike { return new FakeStatement(sql); }
  async batch(statements: PreparedStatementLike[]): Promise<D1ResultLike[]> {
    return statements.map(() => ({ success: true, meta: { changes: 1, rows_written: 1 } }));
  }
}

class ControlStatement {
  constructor(private readonly db: ControlDb, private readonly query: string, private readonly values: unknown[]) {}
  bind(...values: unknown[]): ControlStatement { return new ControlStatement(this.db, this.query, values); }
  async first<T = unknown>(): Promise<T | null> {
    if (this.query.includes("FROM control_head")) return (this.db.head ?? null) as T | null;
    if (this.query.includes("FROM control_snapshots WHERE config_version = ? AND epoch = ?")) {
      const row = this.db.snapshots.get(`${this.values[0]}:${this.values[1]}`) ?? null;
      return row as T | null;
    }
    if (this.query.includes("FROM control_snapshots WHERE validation_status = 'VALIDATED'")) {
      const now = Number(this.values[0]);
      const rows = [...this.db.snapshots.values()].filter((row) => row.validation_status === "VALIDATED" && row.revoked === 0 && row.activation_time <= now && row.expiry_time > now);
      rows.sort((a, b) => b.config_version - a.config_version || b.epoch - a.epoch);
      return (rows[0] ?? null) as T | null;
    }
    return null;
  }
  async run(): Promise<unknown> { return { meta: { changes: 1 } }; }
}

class ControlDb implements W04Db {
  readonly snapshots = new Map<string, any>();
  head: { config_version: number; epoch: number } | null = null;
  prepare(query: string): ControlStatement { return new ControlStatement(this, query, []); }
  async batch(statements: Array<unknown>): Promise<unknown[]> {
    const typed = statements as ControlStatement[];
    const insert = typed[0];
    const values = (insert as any).values ?? [];
    const key = `${values[0]}:${values[1]}`;
    this.snapshots.set(key, {
      config_version: values[0], epoch: values[1], activation_time: values[2], expiry_time: values[3],
      validation_status: "VALIDATED", source: values[4], revoked: 0, payload_json: values[5],
    });
    const headStmt = typed[1] as any;
    const headValues = headStmt.values ?? [];
    this.head = { config_version: headValues[0], epoch: headValues[1] };
    return [{}, {}];
  }
}

const controlDb = new ControlDb();
const w04Binding = {
  fetch: (request: Request) => w04.fetch(request, { CONTROL_DB: controlDb }),
};
const w03Binding: W02Binding = {
  fetch: (request) => w03.fetch(request, { DB: new FakeDb(), W04: w04Binding }),
};
const w02Binding: W01Binding = {
  fetch: (request) => w02.fetch(request, { W03: w03Binding }),
};

function writeEnvelope(epoch = 1) {
  return {
    request: {
      requestId: "integration-w03-1", tenantId: "tenant-1", principalScope: "scope-1",
      operation: "content.write", operationVersion: "1", deadlineAt: Date.now() + 5_000,
      budget: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 0, rowsWritten: 1, retries: 0, payloadBytes: 1024 },
      payload: {
        write: {
          logicalTargetId: "content-1", executionEpoch: epoch,
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

async function publishEpoch(epoch: number): Promise<void> {
  const now = Date.now();
  const response = await w04.fetch(new Request("https://w04/v1/control/publish", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ configVersion: epoch, epoch, activationTime: now - 1_000, expiryTime: now + 60_000, source: "integration", payload: { placement: { logical: 64 } } }),
  }), { CONTROL_DB: controlDb });
  assert.equal(response.status, 201);
}

test("W01 -> W02 -> W03 -> W04 control epoch gate commits a write", async () => {
  await publishEpoch(1);
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(writeEnvelope(1)), headers: { "content-type": "application/json" },
  }), { W02: w02Binding });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "COMMITTED", requestId: "integration-w03-1", contractId: "content-write-v1",
    contractVersion: "D1F-3.0-MASTER-v1.0", logicalTargetId: "content-1", executionEpoch: 1,
    accounting: { d1Statements: 1, rowsWritten: 1, payloadBytes: 17, retries: 0 }, affectedRows: 1,
  });
});

test("W01 -> W02 -> W03 rejects a stale W04 control epoch", async () => {
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(writeEnvelope(2)), headers: { "content-type": "application/json" },
  }), { W02: w02Binding });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { status: "ERROR", code: "STALE_EXECUTION_EPOCH", message: "epoch is not the active control epoch" });
});

test("W01 -> W02 rejects a write when W03 binding is unavailable", async () => {
  const response = await gateway.fetch(new Request("https://gateway.invalid/", {
    method: "POST", body: JSON.stringify(writeEnvelope()), headers: { "content-type": "application/json" },
  }), { W02: { fetch: (request) => w02.fetch(request, {}) } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "W03_UNAVAILABLE" });
});
