import test from "node:test";
import assert from "node:assert/strict";
import { parseGatewayEnvelope, ValidationError } from "../src/validation.ts";

const base = () => ({
  request: { requestId: "r", tenantId: "t", principalScope: "s", operation: "content.read:v1", operationVersion: "1", deadlineAt: Date.now() + 5000, budget: {}, payload: null },
  contract: { contractId: "c", contractVersion: "D1F-3.0-MASTER-v1.0", operation: "content.read:v1", operationVersion: "1", mode: "READ", maxDeadlineMs: 25000, limits: {} },
});

test("rejects an invalid operation token", () => {
  const body = base(); (body.request as any).operation = "query/read";
  assert.throws(() => parseGatewayEnvelope(body, Date.now()), (e: unknown) => e instanceof ValidationError && e.code === "INVALID_REQUEST");
});

test("rejects an invalid operation version token", () => {
  const body = base(); (body.request as any).operationVersion = "v 1";
  assert.throws(() => parseGatewayEnvelope(body, Date.now()), (e: unknown) => e instanceof ValidationError && e.code === "INVALID_REQUEST");
});

test("accepts contract operation punctuation", () => {
  const result = parseGatewayEnvelope(base(), Date.now());
  assert.equal(result.request.operation, "content.read:v1");
});
