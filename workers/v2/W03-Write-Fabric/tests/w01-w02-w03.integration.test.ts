import test from "node:test";
import assert from "node:assert/strict";
import { handleGateway } from "../../W01-Fabric-Gateway/src/index.ts";
import { compileExecutionPlan, type ExecutionRequest, type VersionedExecutionContract } from "../../W02-Execution-Fabric/src/plan.ts";
import { executeWrite, type D1DatabaseLike, type D1ResultLike, type PreparedStatementLike } from "../src/write.ts";

class IntegrationStatement implements PreparedStatementLike {
  constructor(private readonly db: IntegrationDb, private readonly sql: string) {}
  bind(..._values: any[]): PreparedStatementLike { return this; }
  async run(): Promise<D1ResultLike> { return { success: true, meta: { changes: 1 } }; }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    if (this.sql.startsWith("SELECT state")) return { results: [] };
    return { results: [] };
  }
}
class IntegrationDb implements D1DatabaseLike {
  prepare(sql: string): PreparedStatementLike { return new IntegrationStatement(this, sql); }
  async batch(statements: PreparedStatementLike[]): Promise<D1ResultLike[]> {
    return statements.map((_, i) => ({ success: true, meta: { changes: i === 1 ? 1 : 1 } }));
  }
}

const request: ExecutionRequest = {
  requestId: "integration-1", tenantId: "tenant-a", principalScope: "principal-a", operation: "write",
  operationVersion: "1", deadlineAt: Date.now() + 10_000,
  budget: { fanout: 1, concurrency: 1, d1Statements: 8, rowsRead: 0, rowsWritten: 10, retries: 2, payloadBytes: 4096 },
};
const contract: VersionedExecutionContract = {
  contractId: "D1F-W03-WRITE-FABRIC-v1.0", contractVersion: "D1F-3.0-MASTER-v1.0", operation: "write",
  operationVersion: "1", mode: "WRITE", maxDeadlineMs: 25_000,
  limits: { fanout: 1, concurrency: 1, d1Statements: 8, rowsRead: 0, rowsWritten: 10, retries: 2, payloadBytes: 4096 },
};

test("W01 -> W02 plan -> W03 write preserves execution identity", async () => {
  let compiled: any;
  const gateway = await handleGateway(
    new Request("https://w01.test/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request, contract }) }),
    { W02: { fetch: async (incoming) => {
      const body = await incoming.json() as { request: ExecutionRequest; contract: VersionedExecutionContract };
      compiled = compileExecutionPlan(body.request, body.contract);
      return new Response(JSON.stringify({ status: "COMPILED", plan: compiled }), { status: 200 });
    } } },
  );
  assert.equal(gateway.status, 200);
  assert.equal(compiled.requestId, request.requestId);
  assert.equal(compiled.tenantId, request.tenantId);

  const result = await executeWrite(new IntegrationDb(), {
    requestId: compiled.requestId, planId: compiled.planId, contractId: compiled.contractId,
    contractVersion: compiled.contractVersion, architectureId: compiled.architectureId,
    tenantId: compiled.tenantId, principalScope: compiled.principalScope, operation: compiled.operation,
    operationVersion: compiled.operationVersion, logicalTargetId: "logical-1", executionEpoch: 1,
    deadlineAt: compiled.deadlineAt,
    budget: { d1Statements: compiled.requestedBudget.d1Statements, rowsWritten: compiled.requestedBudget.rowsWritten, payloadBytes: compiled.requestedBudget.payloadBytes, retries: compiled.requestedBudget.retries },
  }, { statement: "UPDATE app_table SET value=? WHERE id=?", bindings: ["ok", "1"], retryable: false });
  assert.equal(result.status, "COMMITTED");
  assert.equal(result.requestId, request.requestId);
  assert.equal(result.contractVersion, contract.contractVersion);
  assert.equal(result.logicalTargetId, "logical-1");
});
