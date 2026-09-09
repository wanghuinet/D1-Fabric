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

test("accepts a valid bounded generic request", () => {
  const result = parseAndValidateBody(validBody(), now);
  assert.equal(result.requestId, "req-1");
  assert.equal(result.tenantId, "tenant-1");
  assert.equal(result.budget.fanout, 0);
});

test("rejects non-object body", () => {
  assert.throws(() => parseAndValidateBody(null, now), (error: unknown) =>
    error instanceof ValidationError && error.code === "INVALID_REQUEST",
  );
});

test("rejects missing identity", () => {
  const body = validBody();
  delete (body as Record<string, unknown>).requestId;
  assert.throws(() => parseAndValidateBody(body, now), (error: unknown) =>
    error instanceof ValidationError && error.code === "INVALID_REQUEST",
  );
});

test("rejects expired deadline", () => {
  assert.throws(
    () => parseAndValidateBody(validBody({ deadlineAt: now }), now),
    (error: unknown) => error instanceof ValidationError && error.code === "INVALID_DEADLINE",
  );
});

test("rejects deadline beyond the 25 second W01 envelope", () => {
  assert.throws(
    () => parseAndValidateBody(validBody({ deadlineAt: now + 25_001 }), now),
    (error: unknown) => error instanceof ValidationError && error.code === "INVALID_DEADLINE",
  );
});

test("rejects non-integer budget", () => {
  const body = validBody({ budget: { ...validBody().budget, fanout: 0.5 } });
  assert.throws(() => parseAndValidateBody(body, now), (error: unknown) =>
    error instanceof ValidationError && error.code === "INVALID_BUDGET",
  );
});

test("rejects execution budget above the non-executing W01 envelope", () => {
  const body = validBody({ budget: { ...validBody().budget, retries: 1 } });
  assert.throws(() => parseAndValidateBody(body, now), (error: unknown) =>
    error instanceof ValidationError && error.code === "BUDGET_EXCEEDED",
  );
});
