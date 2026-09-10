import test from "node:test";
import assert from "node:assert/strict";
import { handleGateway } from "../../W01-Fabric-Gateway/src/index.ts";
import { compileExecutionPlan, type ExecutionRequest, type VersionedExecutionContract } from "../../W02-Execution-Fabric/src/plan.ts";
import { handleWrite } from "../src/index.ts";
import type { D1DatabaseLike, D1ResultLike, PreparedStatementLike, WriteIdentity } from "../src/write.ts";

class IntegrationStatement implements PreparedStatementLike {
  private readonly db: IntegrationDb;
  private readonly sql: string;
  constructor(db: IntegrationDb, sql: string) { this.db = db; this.sql = sql; }
  bind(..._values: (string | number | null | ArrayBuffer)[]): PreparedStatementLike { return this; }
  async run(): Promise<D1ResultLike> { return { success: true, meta: { changes: 1, rows_written: 1 } }; }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    if (this.sql.startsWith("SELECT state")) return { results: [] };
    return { results: [] };
  }
}
class IntegrationDb implements D1DatabaseLike {
  prepare(sql: string): PreparedStatementLike { return new IntegrationStatement(this, sql); }
  async batch(statements: PreparedStatementLike[]): Promise<D1ResultLike[]> { return statements.map(() => ({ success: true, meta: { changes: 1, rows_written: 1 } })); }
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
const activeW04 = {
  fetch: async (_incoming: Request) => new Response(JSON.stringify({ epoch: 1 }), { status: 200, headers: { "content-type": "application/json; charset=utf-8" } }),
};

const physicalTargetCatalog = JSON.stringify({
  version: 1,
  targets: [{
    logicalDatabaseId: "db-1",
    logicalShardId: "shard-1",
    physicalShardId: "physical-1",
    topologyVersion: 1,
    physicalTargetId: "target-1",
    bindingName: "DB",
    admitted: true,
  }],
});

const integrationEnv = { DB: new IntegrationDb(), W04: activeW04, PHYSICAL_TARGET_CATALOG_JSON: physicalTargetCatalog };

test("W01 -> W02 plan -> W03 write preserves execution identity", async () => {
  let compiled: ReturnType<typeof compileExecutionPlan> | undefined;
  const gateway = await handleGateway(
    new Request("https://w01.test/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request, contract }) }),
    { W02: { fetch: async (incoming) => {
      const body = await incoming.json() as { request: ExecutionRequest; contract: VersionedExecutionContract };
      compiled = compileExecutionPlan(body.request, body.contract);
      return new Response(JSON.stringify({ status: "COMPILED", plan: compiled }), { status: 200 });
    } } },
  );
  assert.equal(gateway.status, 200);
  if (!compiled) throw new Error("W02 compilation did not produce a plan");
  assert.equal(compiled.requestId, request.requestId);
  assert.equal(compiled.tenantId, request.tenantId);

  const plan = compiled;
  const response = await handleWrite(
    new Request("https://w03.test/", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identity: {
          requestId: plan.requestId, planId: plan.planId, contractId: plan.contractId,
          contractVersion: plan.contractVersion, architectureId: plan.architectureId,
          tenantId: plan.tenantId, principalScope: plan.principalScope, operation: plan.operation,
          operationVersion: plan.operationVersion, logicalDatabaseId: "db-1", logicalShardId: "shard-1", logicalTargetId: "logical-1",
          physicalShardId: "physical-1", topologyVersion: 1, executionEpoch: 1,
          deadlineAt: plan.deadlineAt,
          budget: { d1Statements: plan.requestedBudget.d1Statements, rowsWritten: plan.requestedBudget.rowsWritten, payloadBytes: plan.requestedBudget.payloadBytes, retries: plan.requestedBudget.retries },
        },
        operation: { statement: "UPDATE app_table SET value=? WHERE id=?", bindings: ["ok", "1"], retryable: false },
      }),
    }),
    integrationEnv,
  );
  assert.equal(response.status, 200);
  const result = await response.json() as { status: string; requestId: string; contractVersion: string; logicalTargetId: string; physicalShardId: string };
  assert.equal(result.status, "COMMITTED");
  assert.equal(result.requestId, request.requestId);
  assert.equal(result.contractVersion, contract.contractVersion);
  assert.equal(result.logicalTargetId, "logical-1");
  assert.equal(result.physicalShardId, "physical-1");
});

test("W03 fails closed when W04 control-plane binding is absent", async () => {
  const identity: WriteIdentity = {
    requestId: "control-plane-required-1", planId: "plan-1", contractId: "D1F-W03-WRITE-FABRIC-v1.0",
    contractVersion: "D1F-3.0-MASTER-v1.0", architectureId: "D1F-3.0-ARCH-v1.0", tenantId: "tenant-a",
    principalScope: "principal-a", operation: "write", operationVersion: "1", logicalDatabaseId: "db-1", logicalShardId: "shard-1",
    logicalTargetId: "logical-1", physicalShardId: "physical-1", topologyVersion: 1, executionEpoch: 1, deadlineAt: Date.now() + 10_000,
    budget: { d1Statements: 1, rowsWritten: 1, payloadBytes: 1024, retries: 0 },
  };
  const response = await handleWrite(
    new Request("https://w03.test/", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ identity, operation: { statement: "UPDATE app_table SET value=? WHERE id=?", bindings: ["x", "1"], retryable: false } }),
    }),
    { DB: new IntegrationDb() } as unknown as Parameters<typeof handleWrite>[1],
  );
  assert.equal(response.status, 502);
  assert.equal((await response.json() as { code: string }).code, "D1_EXECUTION_FAILED");
});
