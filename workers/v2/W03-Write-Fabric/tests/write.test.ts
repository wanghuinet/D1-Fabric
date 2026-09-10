import test from "node:test";
import assert from "node:assert/strict";
import { executeWrite, WriteExecutionError, type D1DatabaseLike, type D1ResultLike, type PreparedStatementLike, type WriteIdentity } from "../src/write.js";

function identity(overrides: Partial<WriteIdentity> = {}): WriteIdentity {
  return {
    requestId: "req-1", planId: "plan-1", contractId: "D1F-W03-WRITE-FABRIC-v1.0",
    contractVersion: "D1F-3.0-MASTER-v1.0", architectureId: "D1F-3.0-ARCH-v1.0",
    tenantId: "tenant-a", principalScope: "principal-a", operation: "write", operationVersion: "1",
    logicalTargetId: "logical-1", executionEpoch: 1, deadlineAt: Date.now() + 10_000,
    budget: { d1Statements: 8, rowsWritten: 10, payloadBytes: 4096, retries: 2 }, ...overrides,
  };
}

class MockStatement implements PreparedStatementLike {
  constructor(private readonly sql: string, private readonly db: MockDb, private readonly values: unknown[] = []) {}
  bind(...values: unknown[]): PreparedStatementLike { return new MockStatement(this.sql, this.db, values); }
  async run(): Promise<D1ResultLike> { return this.db.run(this.sql, this.values); }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> { return this.db.all(this.sql, this.values) as { results: T[] }; }
}

class MockDb implements D1DatabaseLike {
  committed = false;
  mutationRuns = 0;
  prepared: string[] = [];
  prepare(sql: string): PreparedStatementLike { this.prepared.push(sql); return new MockStatement(sql, this); }
  async run(sql: string, values: unknown[]): Promise<D1ResultLike> {
    if (sql.startsWith("SELECT state")) return { success: true, results: this.committed ? [{ state: "COMMITTED", affected_rows: 1 }] : [] };
    return { success: true, meta: { changes: sql.includes("UPDATE business") ? 1 : 0 } };
  }
  async all<T = Record<string, unknown>>(sql: string): Promise<{ results: T[] }> {
    if (sql.startsWith("SELECT state") && this.committed) return { results: [{ state: "COMMITTED", affected_rows: 1 } as T] };
    return { results: [] };
  }
  async batch(statements: PreparedStatementLike[]): Promise<D1ResultLike[]> {
    this.mutationRuns += 1;
    this.committed = true;
    return statements.map((_, index) => index === 1 ? { success: true, meta: { changes: 1 } } : { success: true, meta: { changes: 1 } });
  }
}

test("valid single-target write succeeds", async () => {
  const db = new MockDb();
  const result = await executeWrite(db, identity(), { statement: "UPDATE business SET value=? WHERE id=?", bindings: ["x", "1"], retryable: false });
  assert.equal(result.status, "COMMITTED");
  assert.equal(result.affectedRows, 1);
  assert.equal(result.accounting.d1Statements, 1);
});

test("expired deadline is rejected before D1", async () => {
  const db = new MockDb();
  await assert.rejects(() => executeWrite(db, identity({ deadlineAt: Date.now() - 1 }), { statement: "UPDATE x SET y=1", bindings: [], retryable: false }), (error: unknown) => error instanceof WriteExecutionError && error.code === "DEADLINE_EXCEEDED");
  assert.equal(db.prepared.length, 0);
});

test("cancelled request is rejected before D1", async () => {
  const db = new MockDb();
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => executeWrite(db, identity(), { statement: "UPDATE x SET y=1", bindings: [], retryable: false }, controller.signal), (error: unknown) => error instanceof WriteExecutionError && error.code === "CANCELLED");
  assert.equal(db.prepared.length, 0);
});

test("retryable mutation requires idempotency key", async () => {
  const db = new MockDb();
  await assert.rejects(() => executeWrite(db, identity(), { statement: "UPDATE x SET y=1", bindings: [], retryable: true }), (error: unknown) => error instanceof WriteExecutionError && error.code === "IDEMPOTENCY_KEY_REQUIRED");
});

test("retryable mutation requires atomic protocol", async () => {
  const db = new MockDb();
  await assert.rejects(() => executeWrite(db, identity(), { statement: "UPDATE x SET y=1", bindings: [], retryable: true, idempotencyKey: "k" }), (error: unknown) => error instanceof WriteExecutionError && error.code === "INVALID_REQUEST");
});

test("retryable mutation commits through one D1 batch and is replayable", async () => {
  const db = new MockDb();
  const op = {
    statement: "UPDATE business SET value=? WHERE id=?",
    bindings: ["x", "1"], retryable: true, idempotencyKey: "idem-1",
    atomicIdempotency: { guardedMutation: { sql: "UPDATE business SET value=? WHERE id=? AND EXISTS (SELECT 1 FROM __d1f_idempotency WHERE tenant_id=? AND idempotency_key=? AND owner_request_id=? AND state='IN_FLIGHT')", bindings: ["x", "1", "tenant-a", "idem-1", "req-1"] } },
  } as const;
  const first = await executeWrite(db, identity(), op);
  assert.equal(first.status, "COMMITTED");
  assert.equal(first.affectedRows, 1);
  assert.equal(db.mutationRuns, 1);
  const second = await executeWrite(db, identity({ requestId: "req-2" }), op);
  assert.equal(second.status, "REPLAYED");
  assert.equal(second.affectedRows, 1);
  assert.equal(db.mutationRuns, 1);
});

test("tenant isolation changes the idempotency namespace", async () => {
  const db = new MockDb();
  const op = { statement: "UPDATE business SET value=1", bindings: [], retryable: true, idempotencyKey: "same", atomicIdempotency: { guardedMutation: { sql: "UPDATE business SET value=1 WHERE EXISTS (SELECT 1 FROM __d1f_idempotency)", bindings: [] } } } as const;
  const a = await executeWrite(db, identity({ tenantId: "tenant-a" }), op);
  assert.equal(a.status, "COMMITTED");
  const b = await executeWrite(db, identity({ tenantId: "tenant-b", requestId: "req-b" }), op);
  assert.equal(b.status, "COMMITTED");
});

test("expected write count mismatch is rejected", async () => {
  const db = new MockDb();
  await assert.rejects(() => executeWrite(db, identity(), { statement: "UPDATE x SET y=1", bindings: [], retryable: false, expectedWriteCount: 2 }), (error: unknown) => error instanceof WriteExecutionError && error.code === "D1_RESULT_INVALID");
});

test("zero D1 statement budget stops admission", async () => {
  const db = new MockDb();
  await assert.rejects(() => executeWrite(db, identity({ budget: { d1Statements: 0, rowsWritten: 10, payloadBytes: 4096, retries: 0 } }), { statement: "UPDATE x SET y=1", bindings: [], retryable: false }), (error: unknown) => error instanceof WriteExecutionError && error.code === "BUDGET_EXCEEDED");
  assert.equal(db.prepared.length, 0);
});
