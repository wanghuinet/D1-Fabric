import test from "node:test";
import assert from "node:assert/strict";
import { parseAndValidateBody, ValidationError } from "../src/validation.ts";

const now = Date.now();

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "req-1",
    tenantId: "tenant-1",
    principalScope: "scope-1",
    operation: "query.read",
    operationVersion: "1",
    deadlineAt: now + 5_000,
    budget: {
      fanout: 0,
      concurrency: 0,
      d1Statements: 0,
      rowsRead: 0,
      rowsWritten: 0,
      retries: 0,
    },
    payload: { bounded: true },
    ...overrides,
  };
}

test("rejects an invalid operation token", () => {
  assert.throws(
    () => parseAndValidateBody(validBody({ operation: "query read" }), now),
    (error: unknown) => error instanceof ValidationError && error.code === "INVALID_REQUEST",
  );
});

test("rejects an invalid operation version token", () => {
  assert.throws(
    () => parseAndValidateBody(validBody({ operationVersion: "v 1" }), now),
    (error: unknown) => error instanceof ValidationError && error.code === "INVALID_REQUEST",
  );
});

test("accepts generic operation token punctuation used by the contract", () => {
  const result = parseAndValidateBody(validBody({ operation: "content.read:v1" }), now);
  assert.equal(result.operation, "content.read:v1");
});
