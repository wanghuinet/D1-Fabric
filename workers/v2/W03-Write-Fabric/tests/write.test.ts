import test from "node:test";
import assert from "node:assert/strict";
import { executeWrite, WriteExecutionError, type D1DatabaseLike, type D1ResultLike, type PreparedStatementLike, type WriteIdentity, type D1Value } from "../src/write.ts";

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
  private readonly sql: string;
  private readonly db: MockDb;
  private readonly values: D1Value[];

  constructor(sql: string, db: MockDb, values: D1Value[] = []) {
    this.sql = sql;
    this.db = db;
    this.values = values;
  }

  bind(...values: D1Value[]): PreparedStatementLike { return new MockStatement(this.sql, this.db, values); }
  async run(): Promise<D1ResultLike> { return this.db.run(this.sql, this.values); }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const result = await this.db.all(this.sql, this.values);
    return result as { results: T[] };
  }
}

class MockDb implements D1DatabaseLike {
  mutationRuns = 0;
  prepared: string[] = [];
  nextCommittedKey = "idem-1";
  nextCommittedTenant = "tenant-a";
  protected readonly committedKeys = new Set<string>();
  prepare(sql: string): PreparedStatementLike { this.prepared.push(sql); return new MockStatement(sql, this); }
  async run(sql: string, values: D1Value[]): Promise<D1ResultLike> {
    if (sql.startsWith("SELECT state")) return { success: true, results: this.committedKeys.has(this.key(values)) ? [{ state: "COMMITTED", affected_rows: 1 }] : [] };
    return { success: true, meta: { changes: sql.includes("UPDATE business") ? 1 : 0, rows_written: sql.includes("UPDATE business") ? 1 : 0 } };
  }
  async all<T = Record<string, unknown>>(sql: string, values: D1Value[]): Promise<{ results: T[] }> {
    if (sql.startsWith("SELECT state") && this.committedKeys.has(this.key(values))) return { results: [{ state: "COMMITTED", affected_rows: 1 } as T] };
    return { results: [] };
  }
  async batch(statements: PreparedStatementLike[]): Promise<D1ResultLike[]> {
    this.mutationRuns += 1;
    this.markCommitted(this.nextCommittedTenant, "principal-a", "write", "1", this.nextCommittedKey);
    return statements.map((_, index) => index === 1 ? { success: true, meta: { changes: 1, rows_written: 1 } } : { success: true, meta: { changes: 1, rows_written: 1 } });
  }
  markCommitted(tenant: string, principal: string, operation: string, version: string, key: string): void { this.committedKeys.add([tenant, principal, operation, version, key].join("|")); }
  private key(values: D1Value[]): string { return values.slice(0, 5).map(String).join("|"); }
}

const retryableOperation = {
  statement: "UPDATE business SET value=? WHERE id=?",
  bindings: ["x", "1"], retryable: true, idempotencyKey: "idem-1",
  atomicIdempotency: { guardedMutation: { sql: "UPDATE business SET value=? WHERE id=? AND EXISTS (SELECT 1 FROM __d1f_idempotency WHERE tenant_id=? AND idempotency_key=? AND owner_request_id=? AND state='IN_FLIGHT')", bindings: ["x", "1", "tenant-a", "idem-1", "req-1"] } },
} as const;

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

test("retryable mutation refuses a budget below its five-statement admission", async () => {
  const db = new MockDb();
  await assert.rejects(() => executeWrite(db, identity({ budget: { d1Statements: 4, rowsWritten: 10, payloadBytes: 4096, retries: 2 } }), retryableOperation), (error: unknown) => error instanceof WriteExecutionError && error.code === "BUDGET_EXCEEDED");
  assert.equal(db.prepared.length, 1);
  assert.equal(db.mutationRuns, 0);
});

test("retryable mutation commits through one D1 batch and is replayable", async () => {
  const db = new MockDb();
  const first = await executeWrite(db, identity(), retryableOperation);
  assert.equal(first.status, "COMMITTED");
  assert.equal(first.affectedRows, 1);
  assert.equal(first.accounting.d1Statements, 5);
  assert.equal(db.mutationRuns, 1);
  const second = await executeWrite(db, identity({ requestId: "req-2" }), retryableOperation);
  assert.equal(second.status, "REPLAYED");
  assert.equal(second.affectedRows, 1);
  assert.equal(second.accounting.d1Statements, 1);
  assert.equal(db.mutationRuns, 1);
});

test("tenant isolation prevents cross-tenant replay", async () => {
  const db = new MockDb();
  db.markCommitted("tenant-a", "principal-a", "write", "1", "same");
  db.nextCommittedKey = "same";
  db.nextCommittedTenant = "tenant-b";
  const op = { ...retryableOperation, idempotencyKey: "same" } as const;
  const b = await executeWrite(db, identity({ tenantId: "tenant-b", requestId: "req-b" }), op);
  assert.equal(b.status, "COMMITTED");
  assert.equal(db.mutationRuns, 1);
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

test("retryable transport failure is classified as unknown outcome", async () => {
  class FailingDb extends MockDb {
    override async batch(_statements: PreparedStatementLike[]): Promise<D1ResultLike[]> { throw new Error("network closed"); }
  }
  const db = new FailingDb();
  await assert.rejects(() => executeWrite(db, identity(), retryableOperation), (error: unknown) => error instanceof WriteExecutionError && error.code === "COMMIT_UNKNOWN");
});
