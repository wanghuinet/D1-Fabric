import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import assert from "node:assert/strict";
import {
  executeWrite,
  type D1DatabaseLike,
  type D1ResultLike,
  type D1Value,
  type PreparedStatementLike,
  type WriteIdentity,
} from "../src/write.ts";

function identity(overrides: Partial<WriteIdentity> = {}): WriteIdentity {
  return {
    requestId: "req-1", planId: "plan-1", contractId: "D1F-W03-WRITE-FABRIC-v1.0",
    contractVersion: "D1F-3.0-MASTER-v1.0", architectureId: "D1F-3.0-ARCH-v1.0",
    tenantId: "tenant-a", principalScope: "principal-a", operation: "write", operationVersion: "1",
    logicalTargetId: "logical-1", topologyVersion: 1, executionEpoch: 1, deadlineAt: Date.now() + 10_000,
    budget: { d1Statements: 8, rowsWritten: 10, payloadBytes: 4096, retries: 2 }, ...overrides,
  };
}

class SQLiteStatement implements PreparedStatementLike {
  private readonly statement: ReturnType<DatabaseSync["prepare"]>;
  private readonly values: D1Value[];

  constructor(statement: ReturnType<DatabaseSync["prepare"]>, values: D1Value[] = []) {
    this.statement = statement;
    this.values = values;
  }

  bind(...values: D1Value[]): PreparedStatementLike { return new SQLiteStatement(this.statement, values); }
  async run(): Promise<D1ResultLike> {
    const result = this.statement.run(...(this.values as never[]));
    return { success: true, meta: { changes: Number(result.changes), rows_written: Number(result.changes) } };
  }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    return { results: this.statement.all(...(this.values as never[])) as T[] };
  }
}

class SQLiteD1 implements D1DatabaseLike {
  batchCalls = 0;
  readonly db: DatabaseSync;

  constructor(db = new DatabaseSync(":memory:")) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE business (id INTEGER PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO business (id, value) VALUES (1, 'old'), (2, 'old'), (3, 'old');
      CREATE TABLE __d1f_idempotency (
        tenant_id TEXT NOT NULL,
        principal_scope TEXT NOT NULL,
        operation TEXT NOT NULL,
        operation_version TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        owner_request_id TEXT NOT NULL,
        state TEXT NOT NULL,
        affected_rows INTEGER,
        created_at INTEGER,
        committed_at INTEGER,
        UNIQUE (tenant_id, principal_scope, operation, operation_version, idempotency_key)
      );
    `);
  }
  prepare(sql: string): PreparedStatementLike { return new SQLiteStatement(this.db.prepare(sql)); }
  async batch(statements: PreparedStatementLike[]): Promise<D1ResultLike[]> {
    this.batchCalls += 1;
    this.db.exec("BEGIN");
    const results: D1ResultLike[] = [];
    try {
      for (const statement of statements) results.push(await statement.run());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch { /* preserve original failure */ }
      throw error;
    }
  }
}

const retryableOperation = {
  statement: "UPDATE business SET value=? WHERE id IN (1,2,3)",
  bindings: ["new"],
  retryable: true,
  idempotencyKey: "idem-sqlite-1",
  atomicIdempotency: {
    guardedMutation: {
      sql: "UPDATE business SET value=? WHERE id IN (1,2,3) AND EXISTS (SELECT 1 FROM __d1f_idempotency WHERE tenant_id=? AND idempotency_key=? AND owner_request_id=? AND state='IN_FLIGHT')",
      bindings: ["new", "tenant-a", "idem-sqlite-1", "req-1"],
    },
  },
} as const;

test("SQLite commit-then-transport-loss replays real multi-row affectedRows without a second mutation", async () => {
  class CommitThenDisconnect extends SQLiteD1 {
    override async batch(statements: PreparedStatementLike[]): Promise<D1ResultLike[]> {
      this.batchCalls += 1;
      this.db.exec("BEGIN");
      const results: D1ResultLike[] = [];
      for (const statement of statements) results.push(await statement.run());
      this.db.exec("COMMIT");
      throw new Error("network closed after commit");
    }
  }

  const db = new CommitThenDisconnect();
  const first = await executeWrite(db, identity(), retryableOperation);
  assert.equal(first.status, "COMMITTED");
  assert.equal(first.affectedRows, 3);
  assert.equal(first.accounting.d1Statements, 5);
  assert.equal(db.batchCalls, 1);

  const business = db.db.prepare("SELECT COUNT(*) AS count, SUM(CASE WHEN value='new' THEN 1 ELSE 0 END) AS updated FROM business").get() as { count: number; updated: number };
  assert.deepEqual(business, { count: 3, updated: 3 });

  const replay = await executeWrite(db, identity({ requestId: "req-2" }), retryableOperation);
  assert.equal(replay.status, "REPLAYED");
  assert.equal(replay.affectedRows, 3);
  assert.equal(replay.accounting.d1Statements, 1);
  assert.equal(db.batchCalls, 1);

  db.db.close();
});
