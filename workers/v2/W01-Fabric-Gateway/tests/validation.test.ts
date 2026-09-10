import test from "node:test";
import assert from "node:assert/strict";
import { parseGatewayEnvelope, ValidationError } from "../src/validation.ts";

const now = Date.now();
function valid(overrides: Record<string, unknown> = {}) {
  return {
    request: {
      requestId: "req-1", tenantId: "tenant-1", principalScope: "scope-1",
      operation: "query.read", operationVersion: "1", deadlineAt: now + 5_000,
      budget: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0 }, payload: { ok: true },
    },
    contract: {
      contractId: "query-read-v1", contractVersion: "D1F-3.0-MASTER-v1.0",
      operation: "query.read", operationVersion: "1", mode: "READ", maxDeadlineMs: 25_000,
      limits: { fanout: 1, concurrency: 1, d1Statements: 1, rowsRead: 10, rowsWritten: 0, retries: 0, payloadBytes: 1024 },
    },
    ...overrides,
  };
}

test("accepts a valid request plus execution contract", () => {
  const result = parseGatewayEnvelope(valid(), now);
  assert.equal(result.request.requestId, "req-1");
  assert.equal(result.contract.contractId, "query-read-v1");
});

test("rejects missing request or contract", () => {
  assert.throws(() => parseGatewayEnvelope({}, now), (e: unknown) => e instanceof ValidationError && e.code === "INVALID_REQUEST");
});

test("rejects unsafe operation token", () => {
  const body = valid();
  (body.request as any).operation = "query/read";
  assert.throws(() => parseGatewayEnvelope(body, now), (e: unknown) => e instanceof ValidationError && e.code === "INVALID_REQUEST");
});

test("rejects expired deadline", () => {
  const body = valid();
  (body.request as any).deadlineAt = now;
  assert.throws(() => parseGatewayEnvelope(body, now), (e: unknown) => e instanceof ValidationError && e.code === "INVALID_DEADLINE");
});

test("rejects contract version mismatch", () => {
  const body = valid();
  (body.contract as any).contractVersion = "other";
  assert.throws(() => parseGatewayEnvelope(body, now), (e: unknown) => e instanceof ValidationError && e.code === "INVALID_CONTRACT");
});

test("rejects request and contract operation mismatch", () => {
  const body = valid();
  (body.contract as any).operation = "content.read";
  assert.throws(() => parseGatewayEnvelope(body, now), (e: unknown) => e instanceof ValidationError && e.code === "INVALID_CONTRACT");
});

test("allows nonzero execution budgets because W01 does not execute", () => {
  const result = parseGatewayEnvelope(valid(), now);
  assert.equal(result.request.budget.d1Statements, 1);
});
